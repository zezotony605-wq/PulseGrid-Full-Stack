#include <algorithm>
#include <arpa/inet.h>
#include <atomic>
#include <chrono>
#include <csignal>
#include <cstring>
#include <iomanip>
#include <iostream>
#include <netdb.h>
#include <random>
#include <sstream>
#include <string>
#include <thread>
#include <unistd.h>
#include <vector>

using Clock=std::chrono::steady_clock;
std::atomic<bool> running{true}; std::atomic<unsigned long long> sent{0},failed{0};
struct Config{std::string host="127.0.0.1",device_secret="dev-only-change-me";int port=8080,devices=1000,rate=20,workers=4,batch=100;};
struct HttpResponse{int status=0;std::string body;};

std::string uuid_for(int id){std::ostringstream out;out<<"00000000-0000-4000-8000-"<<std::setfill('0')<<std::setw(12)<<id;return out.str();}
std::string event_json(int device,std::mt19937& rng){
  std::normal_distribution<> heart(84,8),speed(12.2,1.7),systolic(121,7),diastolic(78,5),lat(30.0444,.015),lon(31.2357,.015);std::uniform_int_distribution<> oxygen(96,99);
  auto now=std::chrono::system_clock::now();auto ms=std::chrono::duration_cast<std::chrono::milliseconds>(now.time_since_epoch()).count();std::time_t seconds=ms/1000;std::tm utc{};gmtime_r(&seconds,&utc);
  std::ostringstream ts;ts<<std::put_time(&utc,"%Y-%m-%dT%H:%M:%S")<<'.'<<std::setfill('0')<<std::setw(3)<<ms%1000<<'Z';std::ostringstream out;out<<std::fixed<<std::setprecision(3)
    <<"{\"device_id\":\"PG-"<<std::uppercase<<std::hex<<std::setw(6)<<std::setfill('0')<<device<<std::dec<<"\",\"user_id\":\""<<uuid_for(device)<<"\",\"timestamp\":\""<<ts.str()
    <<"\",\"heart_rate\":"<<std::clamp(static_cast<int>(heart(rng)),45,190)<<",\"speed_kmh\":"<<std::max(0.0,speed(rng))<<",\"systolic_pressure\":"<<std::clamp(static_cast<int>(systolic(rng)),70,220)
    <<",\"diastolic_pressure\":"<<std::clamp(static_cast<int>(diastolic(rng)),40,150)<<",\"oxygen_percent\":"<<oxygen(rng)<<",\"latitude\":"<<lat(rng)<<",\"longitude\":"<<lon(rng)<<'}';return out.str();
}

HttpResponse request(const Config& cfg,const std::string& path,const std::string& body,const std::string& bearer=""){
  addrinfo hints{},*result=nullptr;hints.ai_family=AF_UNSPEC;hints.ai_socktype=SOCK_STREAM;if(getaddrinfo(cfg.host.c_str(),std::to_string(cfg.port).c_str(),&hints,&result)!=0)return{};
  int fd=-1;for(auto* p=result;p;p=p->ai_next){fd=socket(p->ai_family,p->ai_socktype,p->ai_protocol);if(fd>=0&&connect(fd,p->ai_addr,p->ai_addrlen)==0)break;if(fd>=0)close(fd);fd=-1;}freeaddrinfo(result);if(fd<0)return{};
  std::ostringstream wire;wire<<"POST "<<path<<" HTTP/1.1\r\nHost: "<<cfg.host<<"\r\nContent-Type: application/json\r\n";if(!bearer.empty())wire<<"Authorization: Bearer "<<bearer<<"\r\n";wire<<"Content-Length: "<<body.size()<<"\r\nConnection: close\r\n\r\n"<<body;
  const auto data=wire.str();size_t offset=0;while(offset<data.size()){ssize_t n=send(fd,data.data()+offset,data.size()-offset,MSG_NOSIGNAL);if(n<=0){close(fd);return{};}offset+=static_cast<size_t>(n);}
  std::string response;char buffer[4096];while(true){ssize_t n=recv(fd,buffer,sizeof(buffer),0);if(n<=0)break;response.append(buffer,static_cast<size_t>(n));}close(fd);
  HttpResponse out;if(response.size()>=12)out.status=std::stoi(response.substr(9,3));auto split=response.find("\r\n\r\n");if(split!=std::string::npos)out.body=response.substr(split+4);return out;
}

std::string fetch_token(const Config& cfg,int worker_id){
  std::ostringstream body;body<<"{\"deviceId\":\"PG-SIM"<<std::setfill('0')<<std::setw(4)<<worker_id<<"\",\"deviceSecret\":\""<<cfg.device_secret<<"\"}";
  auto response=request(cfg,"/api/v1/auth/device-token",body.str());if(response.status!=200)return{};const std::string key="\"accessToken\":\"";auto start=response.body.find(key);if(start==std::string::npos)return{};start+=key.size();auto end=response.body.find('"',start);return response.body.substr(start,end-start);
}

void worker(const Config& cfg,int worker_id){
  std::mt19937 rng(std::random_device{}()+worker_id);int cursor=worker_id;std::string token=fetch_token(cfg,worker_id);
  const auto interval=std::chrono::microseconds(std::max(1LL,static_cast<long long>(1'000'000.0*cfg.batch/std::max(1,cfg.devices*cfg.rate/cfg.workers))));
  while(running){auto started=Clock::now();if(token.empty()){failed+=cfg.batch;token=fetch_token(cfg,worker_id);std::this_thread::sleep_for(std::chrono::seconds(1));continue;}std::string body="[";for(int i=0;i<cfg.batch;i++){if(i)body+=',';body+=event_json((cursor%cfg.devices)+1,rng);cursor+=cfg.workers;}body+=']';auto response=request(cfg,"/api/v1/telemetry/batch",body,token);if(response.status==202)sent+=cfg.batch;else{failed+=cfg.batch;if(response.status==401)token=fetch_token(cfg,worker_id);}std::this_thread::sleep_until(started+interval);}
}

int main(int argc,char** argv){
  Config cfg;for(int i=1;i<argc;i++){std::string a=argv[i];auto value=[&](){if(i+1>=argc)throw std::runtime_error("missing value for "+a);return std::string(argv[++i]);};if(a=="--host")cfg.host=value();else if(a=="--port")cfg.port=std::stoi(value());else if(a=="--devices")cfg.devices=std::stoi(value());else if(a=="--rate")cfg.rate=std::stoi(value());else if(a=="--workers")cfg.workers=std::stoi(value());else if(a=="--batch")cfg.batch=std::stoi(value());else if(a=="--device-secret")cfg.device_secret=value();else if(a=="--help"){std::cout<<"pulsegrid-sim [--host H] [--port P] [--devices N] [--rate N] [--workers N] [--batch N] [--device-secret S]\n";return 0;}}
  std::signal(SIGINT,[](int){running=false;});std::signal(SIGTERM,[](int){running=false;});std::cout<<"PulseGrid secured simulator: "<<cfg.devices<<" devices × "<<cfg.rate<<" events/s -> "<<cfg.host<<':'<<cfg.port<<'\n';
  std::vector<std::thread> threads;for(int i=0;i<cfg.workers;i++)threads.emplace_back(worker,std::cref(cfg),i);auto previous=sent.load();while(running){std::this_thread::sleep_for(std::chrono::seconds(1));auto current=sent.load();std::cout<<"throughput="<<(current-previous)<<" events/s total="<<current<<" failed="<<failed.load()<<'\n';previous=current;}for(auto& thread:threads)thread.join();return 0;
}
