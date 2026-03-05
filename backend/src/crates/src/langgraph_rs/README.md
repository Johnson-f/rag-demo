# `langgraph_rs` Purpose

## Responsibilities
- Define module boundaries for core graph logic, runtime loop, checkpointing, adapters, and tests.
- Provide a clean migration target where features can land in phases without breaking the entry binary.

## Design intent
This root module will become the stable home for the LangGraph runtime kernel in Rust.
