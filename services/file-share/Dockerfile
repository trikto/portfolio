# syntax=docker/dockerfile:1

FROM golang:1.23-bookworm AS build
WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath -ldflags="-s -w" -o /out/file-share ./cmd/server

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /out/file-share /file-share
USER nonroot:nonroot
EXPOSE 8080 9090
VOLUME ["/data"]
ENTRYPOINT ["/file-share"]
