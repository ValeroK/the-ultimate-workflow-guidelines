# Skills: genai

Read by `experts.js` only; no model reads this file. One section per stage. The order is the priority when the cap is reached. A line is `- <skill> (<selector>)`; at plan a line has no selector, because a model chooses by each skill's `description`.

The facts these skills state were checked live by the maintainer on 2026-10-22 (block D). Model-specific rows name their models and that date; re-check them when a new model is pinned. No tests section: the tests reference holds the agent and retrieval case families on its own.

## plan

- model-calls
- agent-loops-and-tools
- rag-retrieval
- bedrock-and-agentcore

## review

- agent-loops-and-tools (added: tool_use|tool_result|tool_choice|"tools"\s*:|\btools\s*=\s*\[|@tool\b|max_iterations|recursion_limit|max_turns|StateGraph|create_react_agent|AgentExecutor|mcp_servers|mcp_toolset|FastMCP|McpServer|is_error)
- model-calls (added: @anthropic-ai/sdk|from anthropic|import anthropic|anthropic-sdk|messages\.create|messages\.stream|messages\.parse|cache_control|stop_reason|output_config|budget_tokens|"thinking"|\bthinking\s*[:=])
- bedrock-and-agentcore (files: .bedrock_agentcore.yaml, agentcore.json; added: bedrock-runtime|bedrock-agent-runtime|bedrock_runtime|BedrockRuntime|bedrock-agentcore|bedrock_agentcore|AgentCore|\.converse\(|converse_stream|ConverseCommand|InvokeModel|invoke_model|inferenceProfile|inference_profile|guardrailIdentifier|guardrail_identifier|AWS::Bedrock|aws_bedrock)
- rag-retrieval (added: [Ee]mbedding|embed_documents|embed_query|similarity_search|[Vv]ector[Ss]tore|vector_store|pgvector|halfvec|\brerank|[Kk]nowledge[Bb]ase|knowledge_base|retrieve_and_generate)
