---
name: rag-retrieval
description: Use when a change embeds documents or queries, searches vectors, reranks, builds a retrieval-augmented prompt, or uses a Bedrock Knowledge Base, to find embeddings that no longer match, retrieval that answers when it found nothing, citations not tied to what was retrieved, context placed where the model recalls it least, and an index queried before ingestion finished.
verified: 2026-10-22
---

# Retrieval for model calls

## Goal

- **Lets the expert catch:** vectors and queries from different embedding models, an embedding model changed with no re-embedding, top results forwarded whatever their relevance, no answer for "found nothing", citations the model can invent, long context ordered so the evidence sits in the middle, and a knowledge base read before it is ready.
- **Applies to:** embedding calls, vector search, rerankers, prompt assembly from retrieved chunks, Knowledge Base ingestion and `retrieve` or `retrieve_and_generate` calls.
- **Not for:** how vectors are stored and indexed (index type, operator class, migrations: data); whether a retrieval eval can fail (quality, `eval-integrity`); instructions planted in retrieved text (security).

Sources: **[R]** the maintainer's live check of the DynamoDB vector search and Bedrock Knowledge Base pages and arXiv 2307.03172, block D (2026-10-22); **[T]** ECC `rag-pipeline-reviewer`, wshobson `llm-application-dev` and timescale/pg-aiguide (MIT, Apache-2.0), not checked; **[O]** our own reasoning.

## First, establish the target

- **The embedding model and dimension** for stored vectors and for queries, from configuration, and where each is set.
- **Whether a measurement of retrieval exists** (recall at k, a labelled set): a reranker or filter is judged against it, not against taste.

## Embeddings

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| Query and stored vectors must come from the same embedding model [R] | The query path and the ingestion path configured separately, with different model ids or defaults | One shared setting feeds both |
| A changed embedding model or dimension needs every stored vector re-embedded [R]; search over a mix returns noise without an error [O] | A model id or dimension changed with no re-index step, migration or new index | The change ships a full re-index and switches reads after it |

## Retrieval and the answer

| Rule | What breaks it in a diff | When it does not apply |
|---|---|---|
| Retrieval that can find nothing relevant needs an answer for that, instead of the model answering from nothing [T] | Top-k chunks forwarded with no score threshold, and a prompt with no "say you do not know" path | Small curated corpora where a measurement shows recall |
| Claims are tied to retrieved chunks: citations come from the chunk ids the code passed, not from text the model writes [T] | Citations parsed out of free text, or source links built from model output | |
| A reranker that returns its input order, or one added with no measured problem, is cost with no gain [T] | A reranking step whose output is not used, or that passes items through unchanged | |
| Accuracy is highest when the relevant text is at the start or end of a long context and lowest in the middle (GPT-3.5-Turbo, 20 documents: 75.8 percent first, 53.8 percent tenth, below its 56.1 percent closed-book) [R] | Many chunks concatenated with the most relevant placed in the middle, or sorted in reverse | Short contexts |
| Sources that contradict each other need a precedence rule [T] | Two retrieval sources merged with no order or recency rule | |

## Bedrock Knowledge Bases

- An ingestion job must reach `COMPLETE`, plus a few minutes for the index, before queries see the data [R]. A deploy or test that queries straight after starting ingestion gets nothing [O].

## Not a finding

- No reranker on a small, curated corpus with measured recall.
- An index type or operator class (data's).
- An embedding model you would not have chosen.
