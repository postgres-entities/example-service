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

async function reqWithContinuationToken({method='GET', endpoint='/todo', body}) {
  let continuationToken;

  do {
    let req = {
      method,
      path: endpoint,
      body,
    };

    if (continuationToken) {
      req.query = {continuationToken};
    }

    let _body = JSON.parse(await _request(req));

    continuationToken = _body.continuationToken;

  } while (continuationToken);
}

async function stream() {
  while (true) {
    try {
      let start = process.hrtime.bigint();

      await _request({path: '/todo-stream'});

      let end = process.hrtime.bigint();
      let duration = Number(end - start) / 1e9;
    } catch (err) {
      console.dir(err);
    }
  }

}

async function paginate() {
  while (true) {
    try {
      let start = process.hrtime.bigint();

      await reqWithContinuationToken({endpoint: '/todo'});

      let end = process.hrtime.bigint();
      let duration = Number(end - start) / 1e9;
    } catch (err) {
      console.dir(err);
    }
  }
}

async function test() {
  try {
    while (true) {
      let id = uuid.v4();


      /*await reqWithContinuationToken({endpoint: '/todo-overdue'});

      if (Math.random() < 0.01) {
        await reqWithContinuationToken({endpoint: '/todo'});
      }*/

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

      await request({id});
      await request({id});

      // Mark 20% of tasks completed
      if (Math.random() < 0.2) {
        await request({
          id,
          method: 'POST',
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

      await request({id});
      await request({id});
      await request({id});

      // Delete 10% of tasks completed
      if (Math.random() < 0.1) {
        await request({id, method: 'DELETE'});
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
    stream(),
    paginate(),
    test(),
    test(),
    test(),
    test(),
  ]).catch(err => {
    console.dir(err);
    process.exit(1);
  });
}
