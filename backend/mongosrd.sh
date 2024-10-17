#!/bin/bash

sudo mongod --configsvr --replSet configRS --port 27019 --dbpath ~/mongodb/configsvr1 --bind_ip localhost &
sudo mongod --configsvr --replSet configRS --port 27020 --dbpath ~/mongodb/configsvr2 --bind_ip localhost &
sudo mongod --configsvr --replSet configRS --port 27021 --dbpath ~/mongodb/configsvr3 --bind_ip localhost &

sudo mongod --shardsvr --replSet shard1RS --port 27018 --dbpath ~/mongodb/shard1 --bind_ip localhost &
sudo mongod --shardsvr --replSet shard2RS --port 27028 --dbpath ~/mongodb/shard2 --bind_ip localhost &
sudo mongod --shardsvr --replSet shard3RS --port 27038 --dbpath ~/mongodb/shard3 --bind_ip localhost &

sudo mongos --configdb configRS/localhost:27019,localhost:27020,localhost:27021 --port 27017 --bind_ip localhost &

echo "MongoDB sharded cluster started"