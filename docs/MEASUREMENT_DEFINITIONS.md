# Measurement Definitions

This file records what the software currently computes. It is a software-method specification, not a claim of psychometric validation.

## Decision accuracy

For each scenario, the selected answer is compared with the authored answer key. The stored value is binary: Correct or Incorrect. Load-level accuracy is the percentage of completed scenarios in that condition marked Correct.

## Response time

At presentation of a decision stage, the browser stores a timestamp using `Date.now()`. When an answer is selected, elapsed milliseconds are converted to seconds. This is browser-side elapsed time and is not represented as laboratory-grade reaction-time instrumentation.

## Workload composite

Six 1–10 ratings are collected: Mental, Physical, Temporal, Performance, Effort, and Frustration.

The current software computes:

`round((Mental + Physical + Temporal + (11 - Performance) + Effort + Frustration) / 6)`

This is an **unweighted NASA-TLX-inspired composite used by the prototype**. It must not be described as the complete standard NASA-TLX procedure without a documented study protocol and appropriate methodological justification.

## Situational-awareness probe

Each scenario has one authored multiple-choice probe and answer key. Accuracy is binary and summarized by load condition.

The probes are **SAGAT-inspired scenario-based situational-awareness questions**. The current software does not implement a complete validated SAGAT freeze/probe protocol.

## Descriptive summaries

The application currently reports, by Low/Medium/High load:
- number of completed trials;
- decision accuracy percentage;
- situational-awareness probe accuracy percentage;
- average prototype workload composite; and
- average response time.

No inferential statistics or causal effect estimates are computed.
