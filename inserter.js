'use strict';

const cluster = require('cluster');
const numCPUs = require('os').cpus().length;
const uuid = require('uuid');
const http = require('http');

const baseUrl = {
  hostname: process.env.SVC_HOSTNAME || '127.0.0.1',
  port: process.env.SVC_PORT || 5555,
}

async function _request({method='GET', path, body, query}) {
  return new Promise((resolve, reject) => {

    if (query) {
      path = `${path}?${new URLSearchParams(query).toString()}`;
    }

    let start = process.hrtime.bigint();

    let request = http.request(Object.assign({path, method}, baseUrl), res => {
      let body = [];
      res.once('error', reject);
      res.on('data', chunk => {
        body.push(chunk);
      });
      res.on('end', () => {
        body = Buffer.concat(body);
        if (res.statusCode >= 300) {
          return reject(body.toString());
        }
        let end = process.hrtime.bigint();
        let duration = Number(end - start) / 1e9;
        return resolve(body);
      });
    });
    request.once('error', reject);
    request.setHeader('content-type', 'application/json');
    if (body) {
      request.write(body);
    }
    request.end();
  });
}

async function request({method='GET', id, body}) {
  return _request({method, path: '/todo/'+id, body});
}

async function insert() {
  try {
    while (true) {
      let id = uuid.v4();

      if (Math.random() > 0.2) {
        await request({
          id,
          method: 'PUT',
          body: JSON.stringify({
            todoId: id,
            priority: Math.floor(Math.random() * 10) + 1,
            title: 'clean kitchen',
            body: 'make sure the kitchen is clean',
            due: new Date(),
            completed: false,
          }),
        });
      } else {
        await request({
          id,
          method: 'PUT',
          body: JSON.stringify({
            todoId: id,
            priority: Math.floor(Math.random() * 10) + 1,
            title: 'dirty kitchen',
            body: 'make sure the kitchen is dirty',
            due: new Date(),
            completed: true,
          }),
        });
      }
    };
  } catch (err) {
    console.dir(err);
  }
}

if (cluster.isMaster) {
  console.log(`Master ${process.pid} is running`);

  // Fork workers.
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
    console.log(`started worker`);
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`worker ${worker.process.pid} died`);
    cluster.fork();
  });
} else {
  Promise.race([
    insert(),
    insert(),
    insert(),
    insert(),
    insert(),
    insert(),
    insert(),
  ]).catch(err => {
    console.dir(err);
    process.exit(1);
  });
}
