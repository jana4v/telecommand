# syntax=docker/dockerfile:1
# Build context: repo root (tm_tc/)
#
# Builds all Go microservices in one shared builder stage.
# Use --target <service-name> to produce the image for a specific service.
#
# Available targets: gateway, iam, ingest, chainmon, comparator,
#                    limiter, simulator, storage, umacs-tc

###############################################################################
# Stage 1 — Download dependencies (cached layer, rebuilt only on go.mod changes)
###############################################################################
FROM golang:1.25-alpine AS deps
WORKDIR /src

# Workspace manifest first so this layer is invalidated only when deps change
COPY GoLang/go.work GoLang/go.work.sum ./

# Per-module manifests (no source yet — just enough for "go work download")
COPY GoLang/internal/go.mod     GoLang/internal/go.sum     ./internal/
COPY GoLang/gateway/go.mod      GoLang/gateway/go.sum      ./gateway/
COPY GoLang/iam/go.mod          GoLang/iam/go.sum          ./iam/
COPY GoLang/ingest/go.mod       GoLang/ingest/go.sum       ./ingest/
COPY GoLang/chainmon/go.mod     GoLang/chainmon/go.sum     ./chainmon/
COPY GoLang/comparator/go.mod   GoLang/comparator/go.sum   ./comparator/
COPY GoLang/limiter/go.mod      GoLang/limiter/go.sum      ./limiter/
COPY GoLang/simulator/go.mod    GoLang/simulator/go.sum    ./simulator/
COPY GoLang/storage/go.mod      GoLang/storage/go.sum      ./storage/
COPY GoLang/umacs-tc/go.mod     GoLang/umacs-tc/go.sum     ./umacs-tc/
COPY GoLang/webserver/go.mod    GoLang/webserver/go.sum    ./webserver/
COPY GoLang/launcher/go.mod     GoLang/launcher/go.sum     ./launcher/

RUN go mod download all

###############################################################################
# Stage 2 — Build all service binaries
###############################################################################
FROM deps AS builder

COPY GoLang/ ./

RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /out/gateway    ./gateway/cmd    && \
    CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /out/iam         ./iam/cmd        && \
    CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /out/ingest      ./ingest/cmd     && \
    CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /out/chainmon    ./chainmon/cmd   && \
    CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /out/comparator  ./comparator/cmd && \
    CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /out/limiter     ./limiter/cmd    && \
    CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /out/simulator   ./simulator/cmd  && \
    CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /out/storage     ./storage/cmd    && \
    CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /out/umacs-tc    ./umacs-tc/cmd

###############################################################################
# Per-service runtime images
# Alpine base: has a shell for debugging on the offline PC + CA certs for TLS.
# Pure-Go binaries (CGO_ENABLED=0) run fine on musl.
###############################################################################
FROM alpine:3.20 AS gateway
RUN apk add --no-cache ca-certificates tzdata
COPY --from=builder /out/gateway /usr/local/bin/gateway
EXPOSE 21000
ENTRYPOINT ["gateway"]
CMD ["/config.yaml"]

FROM alpine:3.20 AS iam
RUN apk add --no-cache ca-certificates tzdata
COPY --from=builder /out/iam /usr/local/bin/iam
EXPOSE 21005
ENTRYPOINT ["iam"]
CMD ["/config.yaml"]

FROM alpine:3.20 AS ingest
RUN apk add --no-cache ca-certificates tzdata
COPY --from=builder /out/ingest /usr/local/bin/ingest
EXPOSE 21004
ENTRYPOINT ["ingest"]
CMD ["--config", "/config.yaml"]

FROM alpine:3.20 AS chainmon
RUN apk add --no-cache ca-certificates tzdata
COPY --from=builder /out/chainmon /usr/local/bin/chainmon
ENTRYPOINT ["chainmon"]
CMD ["--config", "/config.yaml"]

FROM alpine:3.20 AS comparator
RUN apk add --no-cache ca-certificates tzdata
COPY --from=builder /out/comparator /usr/local/bin/comparator
ENTRYPOINT ["comparator"]
CMD ["--config", "/config.yaml"]

FROM alpine:3.20 AS limiter
RUN apk add --no-cache ca-certificates tzdata
COPY --from=builder /out/limiter /usr/local/bin/limiter
ENTRYPOINT ["limiter"]
CMD ["--config", "/config.yaml"]

FROM alpine:3.20 AS simulator
RUN apk add --no-cache ca-certificates tzdata
COPY --from=builder /out/simulator /usr/local/bin/simulator
EXPOSE 21001
ENTRYPOINT ["simulator"]
CMD ["--config", "/config.yaml"]

FROM alpine:3.20 AS storage
RUN apk add --no-cache ca-certificates tzdata
COPY --from=builder /out/storage /usr/local/bin/storage
ENTRYPOINT ["storage"]
CMD ["--config", "/config.yaml"]

FROM alpine:3.20 AS umacs-tc
RUN apk add --no-cache ca-certificates tzdata
COPY --from=builder /out/umacs-tc /usr/local/bin/umacs-tc
EXPOSE 21002 21003
ENTRYPOINT ["umacs-tc"]
CMD ["--config", "/config.yaml"]
