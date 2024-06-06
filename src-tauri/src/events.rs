use serde::{Deserialize, Serialize};

pub trait EventType {
    fn name(&self) -> &str;
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct GotoEvent {
    pub goto: String,
}

impl EventType for GotoEvent {
    fn name(&self) -> &str {
        "goto"
    }
}
