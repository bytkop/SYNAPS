#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use reqwest::{Client, Url};
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{
    collections::HashMap,
    path::PathBuf,
    process::{Child,Command,Stdio},
    io::{BufRead,BufReader,Write},
    fs::OpenOptions,
    sync::{atomic::{AtomicBool, Ordering}, Arc, Mutex, OnceLock},
    time::Instant,
};
use tauri::{ipc::Channel, AppHandle, Manager};

static CANCELLATIONS: OnceLock<Mutex<HashMap<String, Arc<AtomicBool>>>> = OnceLock::new();
static LLAMA_CHILD: OnceLock<Mutex<Option<Child>>> = OnceLock::new();
fn llama_child()->&'static Mutex<Option<Child>>{LLAMA_CHILD.get_or_init(||Mutex::new(None))}
fn cancellations() -> &'static Mutex<HashMap<String, Arc<AtomicBool>>> {
    CANCELLATIONS.get_or_init(|| Mutex::new(HashMap::new()))
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ProviderConfig { kind: String, base_url: String }
#[derive(Debug, Clone, Deserialize, Serialize)]
struct ChatMessage { role: String, content: Value }
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct StreamEvent { kind: String, delta: Option<String>, error: Option<String>, elapsed_ms: Option<u128>, first_chunk_ms: Option<u128>, completion_tokens: Option<u64>, prompt_tokens: Option<u64>, provider_tokens_per_second: Option<f64>, backend_ttft_ms: Option<u128> }
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct DownloadEvent { kind: String, status: Option<String>, total: Option<u64>, completed: Option<u64>, error: Option<String> }
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ProjectVersion { id: i64, name: String, version: i64, saved_at: i64, json: String }

fn checked_url(config: &ProviderConfig, suffix: &str) -> Result<Url, String> {
    let mut base = Url::parse(config.base_url.trim()).map_err(|e| format!("Некорректный URL провайдера: {e}"))?;
    if !matches!(base.scheme(), "http" | "https") { return Err("Поддерживаются только HTTP(S) адреса".into()); }
    let host = base.host_str().unwrap_or_default().to_ascii_lowercase();
    if !matches!(host.as_str(), "localhost" | "127.0.0.1" | "::1" | "[::1]") {
        return Err("Разрешены только localhost/loopback endpoints".into());
    }
    let base_path = base.path().trim_end_matches('/');
    let suffix_path = if base_path.ends_with("/api/v1") && suffix.starts_with("/api/v1/") { &suffix[7..] } else if base_path.ends_with("/v1") && suffix.starts_with("/v1/") { &suffix[3..] } else { suffix };
    base.set_path(&format!("{}{}", base_path, suffix_path));
    base.set_query(None);
    Ok(base)
}
fn http_client() -> Result<Client, String> {
    Client::builder().connect_timeout(std::time::Duration::from_secs(5)).timeout(std::time::Duration::from_secs(600))
        .build().map_err(|e| format!("Ошибка HTTP-клиента: {e}"))
}
fn models_endpoint(kind: &str) -> Result<&'static str, String> {
    match kind { "ollama" => Ok("/api/tags"), "lmstudio-native" => Ok("/api/v1/models"), "openai-compatible" | "llamacpp" => Ok("/v1/models"), other => Err(format!("Неизвестный провайдер: {other}")) }
}
#[tauri::command]
async fn list_models(provider: ProviderConfig) -> Result<Vec<Value>, String> {
    let url=checked_url(&provider,models_endpoint(&provider.kind)?)?;
    let res=http_client()?.get(url).send().await.map_err(|e|format!("Не удалось подключиться к локальному движку: {e}"))?;
    let status=res.status(); if !status.is_success(){return Err(format!("HTTP {status}: {}",res.text().await.unwrap_or_default().chars().take(400).collect::<String>()))}
    let val:Value=res.json().await.map_err(|e|format!("Ответ API не JSON: {e}"))?;
    val.get("models").or_else(||val.get("data")).and_then(Value::as_array).cloned().ok_or_else(||"В ответе API нет массива models/data".into())
}
fn parse_stream_record(kind:&str,line:&str)->(Option<String>,Option<u64>,Option<u64>,bool){
    let raw=if kind=="ollama"{line.trim()}else{line.trim().strip_prefix("data:").unwrap_or(line.trim()).trim()};
    if raw.is_empty()||raw=="[DONE]"{return(None,None,None,raw=="[DONE]")}
    let Ok(v)=serde_json::from_str::<Value>(raw) else{return(None,None,None,false)};
    let delta=if kind=="ollama"{v.pointer("/message/content").and_then(Value::as_str).or_else(||v.get("response").and_then(Value::as_str))}else if kind=="lmstudio-native"{v.get("content").and_then(Value::as_str).or_else(||v.get("delta").and_then(Value::as_str)).or_else(||v.pointer("/message/content").and_then(Value::as_str))}else{v.pointer("/choices/0/delta/content").and_then(Value::as_str).or_else(||v.pointer("/choices/0/message/content").and_then(Value::as_str))};
    let prompt=v.get("prompt_eval_count").or_else(||v.pointer("/usage/prompt_tokens")).or_else(||v.pointer("/result/stats/input_tokens")).or_else(||v.pointer("/stats/input_tokens")).and_then(Value::as_u64);
    let completion=v.get("eval_count").or_else(||v.pointer("/usage/completion_tokens")).or_else(||v.pointer("/result/stats/total_output_tokens")).or_else(||v.pointer("/stats/total_output_tokens")).and_then(Value::as_u64);
    let done=v.get("done").and_then(Value::as_bool).unwrap_or(false)||v.get("type").and_then(Value::as_str).is_some_and(|t|t.contains("complete")||t.contains("final")||t=="chat.end");
    (delta.map(str::to_owned),prompt,completion,done)
}
fn provider_metrics(kind:&str,line:&str)->(Option<f64>,Option<u128>){
    let raw=if kind=="ollama"{line.trim()}else{line.trim().strip_prefix("data:").unwrap_or(line.trim()).trim()};
    let Ok(v)=serde_json::from_str::<Value>(raw)else{return(None,None)};
    let stats=v.pointer("/result/stats").or_else(||v.get("stats"));
    let tps=stats.and_then(|s|s.get("tokens_per_second")).and_then(Value::as_f64);
    let ttft=stats.and_then(|s|s.get("time_to_first_token_seconds")).and_then(Value::as_f64).map(|s|(s.max(0.0)*1000.0) as u128);
    (tps,ttft)
}
#[tauri::command]
async fn stream_completion(
    request_id:String, provider:ProviderConfig, model:String, messages:Vec<ChatMessage>, options:Option<Value>, on_event:Channel<StreamEvent>
)->Result<(),String>{
    if model.trim().is_empty(){return Err("Сначала выберите модель".into())} if messages.is_empty(){return Err("Пустой запрос".into())}
    let cancel=Arc::new(AtomicBool::new(false));
    {let mut m=cancellations().lock().map_err(|_|"Ошибка блокировки отмены")?;m.insert(request_id.clone(),cancel.clone());}
    let started=Instant::now(); let mut first_chunk:Option<u128>=None;let mut prompt_tokens=None;let mut completion_tokens=None;let mut provider_tps=None;let mut backend_ttft=None;let mut accumulated=String::new();
    let kind=provider.kind.clone();
    let request=match kind.as_str(){
      "ollama"=>{let ollama_messages:Vec<Value>=messages.iter().map(|m|{let mut text=String::new();let mut images:Vec<String>=Vec::new();if let Some(parts)=m.content.as_array(){for part in parts{if let Some(t)=part.get("text").and_then(Value::as_str){text.push_str(t)}if let Some(url)=part.pointer("/image_url/url").and_then(Value::as_str){if let Some((_,data))=url.split_once(","){images.push(data.to_string())}}}}else if let Some(t)=m.content.as_str(){text=t.to_string()}else{text=m.content.to_string()}let mut obj=json!({"role":m.role,"content":text});if !images.is_empty(){obj["images"]=json!(images)}obj}).collect();let mut b=json!({"model":model,"messages":ollama_messages,"stream":true});if let Some(o)=options{b["options"]=o;} ("/api/chat",b)},
      "lmstudio-native"=>{if messages.iter().any(|m|m.content.is_array()){cancellations().lock().ok().map(|mut m|m.remove(&request_id));return Err("Vision payload для LM Studio Native ещё не поддержан; переключитесь на OpenAI-compatible API".into())}let system=messages.iter().filter(|m|m.role=="system").map(|m|m.content.as_str().map(str::to_owned).unwrap_or_else(||m.content.to_string())).collect::<Vec<_>>().join("\n\n");let input=messages.iter().filter(|m|m.role!="system").map(|m|m.content.as_str().map(str::to_owned).unwrap_or_else(||m.content.to_string())).collect::<Vec<_>>().join("\n\n");let mut b=json!({"model":model,"input":input,"system_prompt":system,"stream":true});if let Some(o)=options{for key in ["temperature","top_p","top_k","min_p","repeat_penalty"]{if let Some(v)=o.get(key){b[key]=v.clone()}}if let Some(n)=o.get("max_output_tokens").or_else(||o.get("max_tokens")).or_else(||o.get("num_predict")){b["max_output_tokens"]=n.clone()}if let Some(n)=o.get("context_length").or_else(||o.get("num_ctx")){b["context_length"]=n.clone()}}("/api/v1/chat",b)},
      "openai-compatible"|"llamacpp"=>{let mut b=json!({"model":model,"messages":messages.iter().map(|m|json!({"role":m.role,"content":m.content})).collect::<Vec<_>>(),"stream":true,"stream_options":{"include_usage":true}});if let Some(o)=options{if let Some(obj)=o.as_object(){for(k,v)in obj{b[k]=v.clone()}}}("/v1/chat/completions",b)},
      other=>{cancellations().lock().ok().map(|mut m|m.remove(&request_id));return Err(format!("Неподдерживаемый провайдер: {other}"))}
    };
    let url=match checked_url(&provider,request.0){Ok(u)=>u,Err(e)=>{cancellations().lock().ok().map(|mut m|m.remove(&request_id));return Err(e)}};
    let client=http_client()?;
    let mut response=match client.post(url).json(&request.1).send().await{Ok(r)=>r,Err(e)=>{cancellations().lock().ok().map(|mut m|m.remove(&request_id));return Err(format!("Ошибка подключения: {e}"))}};
    let status=response.status();if !status.is_success(){let body=response.text().await.unwrap_or_default();cancellations().lock().ok().map(|mut m|m.remove(&request_id));return Err(format!("Движок вернул HTTP {status}: {}",body.chars().take(500).collect::<String>()))}
    let mut buf=Vec::<u8>::new();let mut interval=tokio::time::interval(std::time::Duration::from_millis(100));
    loop{
      tokio::select!{
        _=interval.tick()=>{if cancel.load(Ordering::Relaxed){let _=on_event.send(StreamEvent{kind:"cancelled".into(),delta:None,error:None,elapsed_ms:Some(started.elapsed().as_millis()),first_chunk_ms:first_chunk,completion_tokens,prompt_tokens,provider_tokens_per_second:provider_tps,backend_ttft_ms:backend_ttft});cancellations().lock().ok().map(|mut m|m.remove(&request_id));return Ok(())}},
        chunk=response.chunk()=>{
          let data=chunk.map_err(|e|format!("Ошибка чтения потока: {e}"))?;
          let Some(data)=data else{break};buf.extend_from_slice(&data);
          while let Some(pos)=buf.iter().position(|b|*b==b'\n'){
            let line=String::from_utf8_lossy(&buf[..pos]).to_string();buf.drain(..=pos);
            let(delta,pt,ct,done)=parse_stream_record(&kind,&line);let(tps,ttft)=provider_metrics(&kind,&line);if pt.is_some(){prompt_tokens=pt}if ct.is_some(){completion_tokens=ct}if tps.is_some(){provider_tps=tps}if ttft.is_some(){backend_ttft=ttft}
            if let Some(delta)=delta{if !delta.is_empty(){if first_chunk.is_none(){first_chunk=Some(started.elapsed().as_millis())}accumulated.push_str(&delta);let _=on_event.send(StreamEvent{kind:"delta".into(),delta:Some(delta),error:None,elapsed_ms:None,first_chunk_ms:first_chunk,completion_tokens,prompt_tokens,provider_tokens_per_second:provider_tps,backend_ttft_ms:backend_ttft});}}
            if done{break}
          }
        }
      }
    }
    if !buf.is_empty(){let line=String::from_utf8_lossy(&buf).to_string();let(delta,pt,ct,_)=parse_stream_record(&kind,&line);let(tps,ttft)=provider_metrics(&kind,&line);if tps.is_some(){provider_tps=tps}if ttft.is_some(){backend_ttft=ttft}if let Some(d)=delta{accumulated.push_str(&d);let _=on_event.send(StreamEvent{kind:"delta".into(),delta:Some(d),error:None,elapsed_ms:None,first_chunk_ms:first_chunk,completion_tokens,prompt_tokens,provider_tokens_per_second:provider_tps,backend_ttft_ms:backend_ttft});}if pt.is_some(){prompt_tokens=pt}if ct.is_some(){completion_tokens=ct}}
    let elapsed=started.elapsed().as_millis();let event_kind=if accumulated.is_empty(){"error"}else{"done"};let error=if accumulated.is_empty(){Some("Поток завершился без текстового ответа; проверьте протокол и модель".into())}else{None};
    let _=on_event.send(StreamEvent{kind:event_kind.into(),delta:None,error,elapsed_ms:Some(elapsed),first_chunk_ms:first_chunk,completion_tokens,prompt_tokens,provider_tokens_per_second:provider_tps,backend_ttft_ms:backend_ttft});
    cancellations().lock().ok().map(|mut m|m.remove(&request_id));Ok(())
}
fn validate_ollama_model_name(model: &str) -> Result<&str, String> {
    let value = model.trim();
    if value.is_empty() || value.len() > 200 || value.starts_with('-') || value.contains("..") {
        return Err("Enter a valid Ollama model tag (max 200 characters).".into());
    }
    if !value.chars().all(|ch| ch.is_ascii_alphanumeric() || matches!(ch, '/' | ':' | '.' | '_' | '-')) {
        return Err("Model tag may contain only letters, numbers, slash, colon, dot, underscore and hyphen.".into());
    }
    if value.starts_with('/') || value.ends_with('/') || value.contains("//") {
        return Err("Model tag path is malformed.".into());
    }
    Ok(value)
}
fn build_ollama_model_request(
    base_model: &str,
    new_model: &str,
    system_prompt: &str,
    temperature: f64,
    top_p: f64,
    top_k: u32,
    num_ctx: u32,
    num_predict: u32,
    stop_sequences: &[String],
) -> Result<Value, String> {
    let base = validate_ollama_model_name(base_model)?;
    let output = validate_ollama_model_name(new_model)?;
    if base == output { return Err("Choose a new model name. The base model is never overwritten.".into()); }
    if system_prompt.len() > 20_000 { return Err("System instructions are limited to 20,000 UTF-8 bytes.".into()); }
    if !temperature.is_finite() || !(0.0..=2.0).contains(&temperature) { return Err("Temperature must be between 0 and 2.".into()); }
    if !top_p.is_finite() || !(0.01..=1.0).contains(&top_p) { return Err("Top P must be between 0.01 and 1.".into()); }
    if !(1..=1000).contains(&top_k) { return Err("Top K must be between 1 and 1000.".into()); }
    if !(256..=131_072).contains(&num_ctx) { return Err("Context must be between 256 and 131072 tokens.".into()); }
    if !(1..=32_768).contains(&num_predict) { return Err("Output tokens must be between 1 and 32768.".into()); }
    if stop_sequences.len() > 8 || stop_sequences.iter().any(|value| value.len() > 120) {
        return Err("Use at most 8 stop sequences, each no longer than 120 bytes.".into());
    }
    let mut parameters = json!({
        "temperature": temperature,
        "top_p": top_p,
        "top_k": top_k,
        "num_ctx": num_ctx,
        "num_predict": num_predict
    });
    if !stop_sequences.is_empty() {
        parameters["stop"] = json!(stop_sequences);
    }
    Ok(json!({
        "model": output,
        "from": base,
        "system": system_prompt,
        "parameters": parameters,
        "stream": true
    }))
}
#[tauri::command]
async fn create_ollama_model(
    request_id: String,
    provider: ProviderConfig,
    base_model: String,
    new_model: String,
    system_prompt: String,
    temperature: f64,
    top_p: f64,
    top_k: u32,
    num_ctx: u32,
    num_predict: u32,
    stop_sequences: Vec<String>,
    on_event: Channel<DownloadEvent>,
) -> Result<(), String> {
    if provider.kind != "ollama" {
        return Err("Creating a derived model configuration requires the local Ollama provider.".into());
    }
    let body = build_ollama_model_request(
        &base_model, &new_model, &system_prompt, temperature, top_p, top_k, num_ctx, num_predict, &stop_sequences,
    )?;
    let cancel = Arc::new(AtomicBool::new(false));
    {
        let mut active = cancellations().lock().map_err(|_| "Model creation cancellation lock failed")?;
        if active.contains_key(&request_id) { return Err("A request with this ID is already active.".into()); }
        active.insert(request_id.clone(), cancel.clone());
    }
    let result = async {
        let url = checked_url(&provider, "/api/create")?;
        let client = Client::builder().connect_timeout(std::time::Duration::from_secs(10))
            .timeout(std::time::Duration::from_secs(24 * 60 * 60)).build()
            .map_err(|error| format!("HTTP client error: {error}"))?;
        let mut response = client.post(url).json(&body).send().await
            .map_err(|error| format!("Ollama model creation failed: {error}"))?;
        let status = response.status();
        if !status.is_success() {
            let text = response.text().await.unwrap_or_default();
            return Err(format!("Ollama returned HTTP {status}: {}", text.chars().take(500).collect::<String>()));
        }
        let mut buffer = Vec::<u8>::new();
        loop {
            if cancel.load(Ordering::Relaxed) {
                let _ = on_event.send(DownloadEvent {
                    kind: "cancelled".into(), status: Some("Cancelled. Ollama may leave a partial derived model.".into()),
                    total: None, completed: None, error: None,
                });
                return Ok(());
            }
            let chunk = response.chunk().await.map_err(|error| format!("Ollama create stream failed: {error}"))?;
            let Some(chunk) = chunk else { break };
            buffer.extend_from_slice(&chunk);
            while let Some(position) = buffer.iter().position(|byte| *byte == b'\n') {
                let line = String::from_utf8_lossy(&buffer[..position]).to_string();
                buffer.drain(..=position);
                let Ok(event) = serde_json::from_str::<Value>(&line) else { continue };
                if let Some(message) = event.get("error").and_then(Value::as_str) { return Err(message.to_owned()); }
                let status = event.get("status").and_then(Value::as_str).unwrap_or("Creating derived model").to_owned();
                if status.eq_ignore_ascii_case("success") {
                    let _ = on_event.send(DownloadEvent { kind: "done".into(), status: Some(status), total: None, completed: None, error: None });
                    return Ok(());
                }
                let _ = on_event.send(DownloadEvent {
                    kind: "progress".into(), status: Some(status), total: event.get("total").and_then(Value::as_u64),
                    completed: event.get("completed").and_then(Value::as_u64), error: None,
                });
            }
        }
        if !buffer.is_empty() {
            if let Ok(event) = serde_json::from_slice::<Value>(&buffer) {
                if let Some(message) = event.get("error").and_then(Value::as_str) { return Err(message.to_owned()); }
                let status = event.get("status").and_then(Value::as_str).unwrap_or("").to_owned();
                if status.eq_ignore_ascii_case("success") {
                    let _ = on_event.send(DownloadEvent { kind: "done".into(), status: Some(status), total: None, completed: None, error: None });
                    return Ok(());
                }
            }
        }
        Err("Ollama create stream ended before reporting success.".into())
    }.await;
    cancellations().lock().ok().map(|mut active| active.remove(&request_id));
    if let Err(error) = &result {
        let _ = on_event.send(DownloadEvent { kind: "error".into(), status: None, total: None, completed: None, error: Some(error.clone()) });
    }
    result
}
#[tauri::command]
async fn pull_ollama_model(
    request_id: String,
    provider: ProviderConfig,
    model: String,
    on_event: Channel<DownloadEvent>,
) -> Result<(), String> {
    if provider.kind != "ollama" {
        return Err("Model downloads are implemented only through the Ollama local provider.".into());
    }
    let model = validate_ollama_model_name(&model)?.to_owned();
    let cancel = Arc::new(AtomicBool::new(false));
    {
        let mut active = cancellations().lock().map_err(|_| "Download cancellation lock failed")?;
        if active.contains_key(&request_id) {
            return Err("A request with this download ID is already active.".into());
        }
        active.insert(request_id.clone(), cancel.clone());
    }
    let result = async {
        let url = checked_url(&provider, "/api/pull")?;
        let client = Client::builder()
            .connect_timeout(std::time::Duration::from_secs(10))
            .timeout(std::time::Duration::from_secs(24 * 60 * 60))
            .build()
            .map_err(|error| format!("HTTP client error: {error}"))?;
        let mut response = client.post(url).json(&json!({"name":model,"stream":true})).send().await
            .map_err(|error| format!("Ollama download connection failed: {error}"))?;
        let status = response.status();
        if !status.is_success() {
            let body = response.text().await.unwrap_or_default();
            return Err(format!("Ollama returned HTTP {status}: {}", body.chars().take(500).collect::<String>()));
        }
        let mut buffer = Vec::<u8>::new();
        let mut last_status = String::new();
        loop {
            if cancel.load(Ordering::Relaxed) {
                let _ = on_event.send(DownloadEvent { kind: "cancelled".into(), status: Some("Cancelled; provider may retain partial blobs.".into()), total: None, completed: None, error: None });
                return Ok(());
            }
            let chunk = response.chunk().await.map_err(|error| format!("Ollama download stream failed: {error}"))?;
            let Some(chunk) = chunk else { break };
            buffer.extend_from_slice(&chunk);
            while let Some(position) = buffer.iter().position(|byte| *byte == b'\n') {
                let line = String::from_utf8_lossy(&buffer[..position]).to_string();
                buffer.drain(..=position);
                let Ok(event) = serde_json::from_str::<Value>(&line) else { continue };
                let status = event.get("status").and_then(Value::as_str).unwrap_or("Downloading").to_owned();
                last_status = status.clone();
                let total = event.get("total").and_then(Value::as_u64);
                let completed = event.get("completed").and_then(Value::as_u64);
                let error = event.get("error").and_then(Value::as_str).map(str::to_owned);
                if let Some(message) = error {
                    return Err(message);
                }
                if status.eq_ignore_ascii_case("success") {
                    let _ = on_event.send(DownloadEvent { kind: "done".into(), status: Some(status), total, completed, error: None });
                    return Ok(());
                }
                let _ = on_event.send(DownloadEvent { kind: "progress".into(), status: Some(status), total, completed, error: None });
            }
        }
        if !buffer.is_empty() {
            if let Ok(event) = serde_json::from_slice::<Value>(&buffer) {
                let status = event.get("status").and_then(Value::as_str).unwrap_or(&last_status).to_owned();
                let total = event.get("total").and_then(Value::as_u64);
                let completed = event.get("completed").and_then(Value::as_u64);
                if status.eq_ignore_ascii_case("success") {
                    let _ = on_event.send(DownloadEvent { kind: "done".into(), status: Some(status), total, completed, error: None });
                    return Ok(());
                }
                let _ = on_event.send(DownloadEvent { kind: "progress".into(), status: Some(status), total, completed, error: None });
            }
        }
        Err("Ollama download stream ended before reporting success.".into())
    }.await;
    cancellations().lock().ok().map(|mut active| active.remove(&request_id));
    if let Err(error) = &result {
        let _ = on_event.send(DownloadEvent { kind: "error".into(), status: None, total: None, completed: None, error: Some(error.clone()) });
    }
    result
}
#[tauri::command]
fn cancel_inference(request_id:String)->Result<bool,String>{let m=cancellations().lock().map_err(|_|"Ошибка блокировки отмены")?;if let Some(flag)=m.get(&request_id){flag.store(true,Ordering::Relaxed);Ok(true)}else{Ok(false)}}

fn pipe_to_log<R: std::io::Read + Send + 'static>(reader:R,path:PathBuf){std::thread::spawn(move||{if let Ok(file)=OpenOptions::new().create(true).append(true).open(path){let mut writer=std::io::BufWriter::new(file);for line in BufReader::new(reader).lines().flatten(){let _=writeln!(writer,"{line}");let _=writer.flush();}}});}
fn llama_log_path(app:&AppHandle)->Result<PathBuf,String>{let dir=app.path().app_log_dir().or_else(|_|app.path().app_data_dir()).map_err(|e|format!("Нет папки логов: {e}"))?;std::fs::create_dir_all(&dir).map_err(|e|e.to_string())?;Ok(dir.join("llama-server.log"))}
#[tauri::command]
async fn start_llama_server(app:AppHandle,executable_path:String,model_path:String,port:u16,context_size:u32,gpu_layers:i32)->Result<Value,String>{
 if !(1024..=65535).contains(&port){return Err("Порт должен быть в диапазоне 1024–65535".into())}
 if !(256..=131072).contains(&context_size){return Err("Контекст должен быть 256–131072".into())}
 if !(-1..=999).contains(&gpu_layers){return Err("GPU layers должны быть от -1 до 999".into())}
 let exe=PathBuf::from(&executable_path);let name=exe.file_name().and_then(|n|n.to_str()).unwrap_or("").to_ascii_lowercase();if !matches!(name.as_str(),"llama-server.exe"|"llama-server"){return Err("Разрешено запускать только явно выбранный бинарник llama-server".into())}if !exe.is_file(){return Err("Файл llama-server не найден".into())}
 let model=PathBuf::from(&model_path);if !model.is_file()||!model.extension().and_then(|x|x.to_str()).is_some_and(|x|x.eq_ignore_ascii_case("gguf")){return Err("Выберите существующий GGUF-файл модели".into())}
 {let mut guard=llama_child().lock().map_err(|_|"Ошибка управления llama-server")?;let still_running=guard.as_mut().map(|child|child.try_wait().map(|status|status.is_none())).transpose().map_err(|e|e.to_string())?.unwrap_or(false);if still_running{return Err("Управляемый llama-server уже работает".into())}*guard=None}
 let log=llama_log_path(&app)?;let mut cmd=Command::new(&exe);cmd.stdout(Stdio::piped()).stderr(Stdio::piped()).stdin(Stdio::null());
 cmd.arg("--host").arg("127.0.0.1").arg("--port").arg(port.to_string()).arg("--model").arg(&model).arg("--ctx-size").arg(context_size.to_string()).arg("--n-gpu-layers").arg(gpu_layers.to_string());
 let mut child=cmd.spawn().map_err(|e|format!("Не удалось запустить llama-server: {e}"))?;let pid=child.id();if let Some(out)=child.stdout.take(){pipe_to_log(out,log.clone())}if let Some(err)=child.stderr.take(){pipe_to_log(err,log)};*llama_child().lock().map_err(|_|"Ошибка управления llama-server")?=Some(child);
 let health=Client::builder().connect_timeout(std::time::Duration::from_millis(500)).timeout(std::time::Duration::from_secs(1)).build().map_err(|e|e.to_string())?;let url=format!("http://127.0.0.1:{port}/health");
 for _ in 0..60{let exited={let mut g=llama_child().lock().map_err(|_|"Ошибка управления llama-server")?;let has_exited=g.as_mut().map(|c|c.try_wait().map(|status|status.is_some())).transpose().map_err(|e|e.to_string())?.unwrap_or(true);if has_exited{*g=None;}has_exited};if exited{return Err("llama-server завершился до успешной health-check. См. локальный лог.".into())}if let Ok(r)=health.get(&url).send().await{if r.status().is_success(){return Ok(json!({"running":true,"pid":pid,"port":port,"health":"ok"}))}}tokio::time::sleep(std::time::Duration::from_millis(500)).await}
 let mut g=llama_child().lock().map_err(|_|"Ошибка управления llama-server")?;if let Some(mut c)=g.take(){let _=c.kill();let _=c.wait();}Err("llama-server не прошёл health-check за 30 секунд; процесс остановлен. См. локальный лог.".into())
}
#[tauri::command]
fn stop_llama_server()->Result<bool,String>{let mut g=llama_child().lock().map_err(|_|"Ошибка управления llama-server")?;if let Some(mut child)=g.take(){child.kill().map_err(|e|format!("Не удалось остановить llama-server: {e}"))?;let _=child.wait();Ok(true)}else{Ok(false)}}
#[tauri::command]
fn llama_server_status()->Result<Value,String>{let mut g=llama_child().lock().map_err(|_|"Ошибка управления llama-server")?;let exited=g.as_mut().map(|child|child.try_wait()).transpose().map_err(|e|e.to_string())?;if let Some(Some(status))=exited{let code=status.code();*g=None;return Ok(json!({"running":false,"exitCode":code}))}if let Some(child)=g.as_ref(){return Ok(json!({"running":true,"pid":child.id()}))}Ok(json!({"running":false}))}
#[tauri::command]
fn llama_server_logs(app:AppHandle)->Result<String,String>{let path=llama_log_path(&app)?;let text=std::fs::read_to_string(path).unwrap_or_default();let lines:Vec<&str>=text.lines().collect();Ok(lines.iter().rev().take(300).rev().copied().collect::<Vec<_>>().join("\n"))}

fn database_path(app:&AppHandle)->Result<PathBuf,String>{let dir=app.path().app_data_dir().map_err(|e|format!("Не удалось определить папку данных: {e}"))?;std::fs::create_dir_all(&dir).map_err(|e|format!("Не удалось создать папку данных: {e}"))?;Ok(dir.join("synaps.sqlite3"))}
fn database(app:&AppHandle)->Result<Connection,String>{let conn=Connection::open(database_path(app)?).map_err(|e|format!("SQLite: {e}"))?;conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; CREATE TABLE IF NOT EXISTS projects(id INTEGER PRIMARY KEY,name TEXT NOT NULL UNIQUE,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL); CREATE TABLE IF NOT EXISTS project_versions(id INTEGER PRIMARY KEY,project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,version INTEGER NOT NULL,saved_at INTEGER NOT NULL,json TEXT NOT NULL,UNIQUE(project_id,version));") .map_err(|e|format!("SQLite migration: {e}"))?;Ok(conn)}
fn now_unix()->i64{std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_secs() as i64}
#[tauri::command]
fn save_project(app:AppHandle,name:String,project_json:String)->Result<ProjectVersion,String>{let _:Value=serde_json::from_str(&project_json).map_err(|e|format!("Проект не является JSON: {e}"))?;if project_json.len()>20_000_000{return Err("Файл проекта превышает 20 МБ".into())}let c=database(&app)?;let now=now_unix();c.execute("INSERT INTO projects(name,created_at,updated_at) VALUES(?1,?2,?2) ON CONFLICT(name) DO UPDATE SET updated_at=excluded.updated_at",params![name,now]).map_err(|e|format!("SQLite: {e}"))?;let id:i64=c.query_row("SELECT id FROM projects WHERE name=?1",params![name],|r|r.get(0)).map_err(|e|format!("SQLite: {e}"))?;let version:i64=c.query_row("SELECT COALESCE(MAX(version),0)+1 FROM project_versions WHERE project_id=?1",params![id],|r|r.get(0)).map_err(|e|format!("SQLite: {e}"))?;c.execute("INSERT INTO project_versions(project_id,version,saved_at,json) VALUES(?1,?2,?3,?4)",params![id,version,now,project_json]).map_err(|e|format!("SQLite version: {e}"))?;let row_id=c.last_insert_rowid();Ok(ProjectVersion{id:row_id,name,version,saved_at:now,json:project_json})}
#[tauri::command]
fn list_projects(app:AppHandle)->Result<Vec<ProjectVersion>,String>{let c=database(&app)?;let mut q=c.prepare("SELECT v.id,p.name,v.version,v.saved_at,v.json FROM project_versions v JOIN projects p ON p.id=v.project_id ORDER BY v.saved_at DESC,v.id DESC LIMIT 200").map_err(|e|e.to_string())?;let rows=q.query_map([],|r|Ok(ProjectVersion{id:r.get(0)?,name:r.get(1)?,version:r.get(2)?,saved_at:r.get(3)?,json:r.get(4)?})).map_err(|e|e.to_string())?;rows.collect::<Result<Vec<_>,_>>().map_err(|e|e.to_string())}
#[tauri::command]
fn restore_project_version(app:AppHandle,version_id:i64)->Result<ProjectVersion,String>{let c=database(&app)?;let p=c.query_row("SELECT p.name,v.version,v.saved_at,v.json FROM project_versions v JOIN projects p ON p.id=v.project_id WHERE v.id=?1",params![version_id],|r|Ok(ProjectVersion{id:version_id,name:r.get(0)?,version:r.get(1)?,saved_at:r.get(2)?,json:r.get(3)?})).optional().map_err(|e|e.to_string())?;p.ok_or_else(||"Версия проекта не найдена".into())}

fn main(){tauri::Builder::default().invoke_handler(tauri::generate_handler![list_models,stream_completion,pull_ollama_model,create_ollama_model,cancel_inference,start_llama_server,stop_llama_server,llama_server_status,llama_server_logs,save_project,list_projects,restore_project_version]).run(tauri::generate_context!()).expect("failed to run SYNAPS desktop application");}

#[cfg(test)]
mod tests{
 use super::*;
 #[test]fn rejects_non_loopback_hosts(){let p=ProviderConfig{kind:"ollama".into(),base_url:"http://example.com:11434".into()};assert!(checked_url(&p,"/api/tags").is_err())}
 #[test]fn accepts_loopback_and_adds_api_path(){let p=ProviderConfig{kind:"ollama".into(),base_url:"http://127.0.0.1:11434".into()};assert_eq!(checked_url(&p,"/api/tags").unwrap().as_str(),"http://127.0.0.1:11434/api/tags")}
 #[test]fn does_not_duplicate_v1_prefix(){let p=ProviderConfig{kind:"llamacpp".into(),base_url:"http://localhost:1234/v1/".into()};assert_eq!(checked_url(&p,"/v1/chat/completions").unwrap().as_str(),"http://localhost:1234/v1/chat/completions")}
 #[test]fn parses_ollama_delta_and_measured_usage(){let(d,p,c,done)=parse_stream_record("ollama",r#"{"message":{"content":"hello"},"prompt_eval_count":3,"eval_count":2,"done":false}"#);assert_eq!(d.as_deref(),Some("hello"));assert_eq!(p,Some(3));assert_eq!(c,Some(2));assert!(!done)}
 #[test]fn parses_openai_sse_delta(){let(d,_,_,_)=parse_stream_record("openai-compatible",r#"data: {"choices":[{"delta":{"content":"hi"}}]}"#);assert_eq!(d.as_deref(),Some("hi"))}
 #[test]fn parses_lmstudio_native_delta_and_stats(){let line=r#"data: {"type":"message.delta","content":"hi"}"#;let(d,_,_,_)=parse_stream_record("lmstudio-native",line);assert_eq!(d.as_deref(),Some("hi"));let stats=r#"data: {"type":"chat.end","result":{"stats":{"input_tokens":8,"total_output_tokens":4,"tokens_per_second":12.5,"time_to_first_token_seconds":0.25}}}"#;let(_,p,c,done)=parse_stream_record("lmstudio-native",stats);assert_eq!(p,Some(8));assert_eq!(c,Some(4));assert!(done);assert_eq!(provider_metrics("lmstudio-native",stats),(Some(12.5),Some(250)))}
 #[test]fn validates_ollama_model_tags_without_path_traversal(){assert_eq!(validate_ollama_model_name("llama3.2:latest").unwrap(),"llama3.2:latest");assert_eq!(validate_ollama_model_name("org/model:tag").unwrap(),"org/model:tag");assert!(validate_ollama_model_name("../secret").is_err());assert!(validate_ollama_model_name("model name").is_err());assert!(validate_ollama_model_name("/absolute").is_err());}
 #[test]fn ollama_derived_model_request_changes_config_and_never_overwrites_base(){let body=build_ollama_model_request("llama3.2:latest","my-assistant:v1","Answer in concise Russian.",0.3,0.8,40,8192,2048,&["END".into()]).unwrap();assert_eq!(body["from"],"llama3.2:latest");assert_eq!(body["model"],"my-assistant:v1");assert_eq!(body["system"],"Answer in concise Russian.");assert_eq!(body["parameters"]["temperature"],0.3);assert_eq!(body["parameters"]["top_k"],40);assert_eq!(body["parameters"]["stop"][0],"END");assert!(build_ollama_model_request("base","base","",0.3,0.8,40,8192,2048,&[]).is_err());}
 #[test]fn ollama_derived_model_request_rejects_out_of_range_parameters(){assert!(build_ollama_model_request("base","derived","",3.0,0.8,40,8192,2048,&[]).is_err());assert!(build_ollama_model_request("base","derived","",0.3,0.0,40,8192,2048,&[]).is_err());assert!(build_ollama_model_request("base","derived","",0.3,0.8,40,10,2048,&[]).is_err());}
}
