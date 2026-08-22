FROM golang:1.24-alpine AS build
WORKDIR /src
COPY . .
# Static binary: the runtime image has no libc.
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/pulsegrid-alerting .

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /out/pulsegrid-alerting /usr/local/bin/pulsegrid-alerting
EXPOSE 8090
ENTRYPOINT ["/usr/local/bin/pulsegrid-alerting"]
