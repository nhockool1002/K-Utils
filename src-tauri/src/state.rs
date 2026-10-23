use std::collections::{HashSet, VecDeque};
use std::sync::Mutex;
use tauri_plugin_shell::process::CommandChild;

pub struct LogEntry {
    pub timestamp_ms: i64,
    pub level: String,
    pub message: String,
}

const MAX_LOG_ENTRIES: usize = 5000;

#[derive(Default)]
pub struct AppState {
    pub jobs: Mutex<std::collections::HashMap<String, CommandChild>>,
    pub canceled: Mutex<HashSet<String>>,
    pub logs: Mutex<VecDeque<LogEntry>>,
}

impl AppState {
    pub fn push_log(&self, level: &str, message: impl Into<String>) {
        let mut logs = match self.logs.lock() {
            Ok(l) => l,
            Err(_) => return,
        };
        if logs.len() >= MAX_LOG_ENTRIES {
            logs.pop_front();
        }
        logs.push_back(LogEntry {
            timestamp_ms: chrono_now_ms(),
            level: level.to_string(),
            message: message.into(),
        });
    }
}

fn chrono_now_ms() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}
