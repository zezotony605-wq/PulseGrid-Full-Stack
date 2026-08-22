FROM gcc:14 AS build
WORKDIR /src
COPY src/main.cpp .
RUN g++ -std=c++20 -O3 -pthread -o pulsegrid-sim main.cpp
FROM debian:bookworm-slim
COPY --from=build /src/pulsegrid-sim /usr/local/bin/pulsegrid-sim
ENTRYPOINT ["pulsegrid-sim"]
CMD ["--host","backend","--devices","1000","--rate","20","--workers","4","--batch","100"]
