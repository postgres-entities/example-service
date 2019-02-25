'use strict';
const express = require('express');
const bodyParser = require('body-parser');
const debug = require('debug')('example-service');
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

const app = express()
const port = process.env.PORT || 5555;

const {createEntityManager, todoEntity} = require('./entities');

async function main() {

  // Determine which connection string to use
  let connectionString = process.env.DATABASE_URL;

  let entityManager = createEntityManager({connectionString});

  // All bodies should be treated as JSON documents
  app.use(bodyParser.json({type: "*/*"}));

  // Define the Rest API
  app.get('/', (req, res) => {
    res.send('Welcome to the TODO Application!');
  });

  app.get('/todo/:id', async (req, res) => {
    try {
      let id = req.params.id;
      debug('Loading ' + id);

      let document = await todoEntity.load({todoId: id});

      console.dir(document);
      
      return res.send(JSON.stringify(document.__json()));

    } catch (err) {
      console.dir(err);
      if (err.code === 'PGEntityNotFoundError') {
        return res.status(400).end();
      }
      return res.status(500).end();
    }
  });

  app.put('/todo/:id', async (req, res) => {
    try {
      let id = req.params.id;
      debug('Creating ' + id);

      let payload = req.body;

      if (payload.todoId !== id) {
        return res.status(400).end();
      }

      // Create a document and then insert it
      let document = todoEntity.createDocument({
        value: {
          todoId: id,
          priority: payload.priority,
          title: payload.title,
          body: payload.body,
          due: new Date(payload.due),
          completed: !!payload.completed,
        }
      });

      // TODO Demonstrate eventual consistency
      await todoEntity.insert(document);
      res.status(200).end();
    } catch (err) {
      console.dir(err);
      if (err.code === 'PGEntityAlreadyExistsError') {
        return res.status(400).end();
      }
      return res.status(500).end();
    }
  });


  app.post('/todo/:id', async (req, res) => {
    try {
      let id = req.params.id;
      debug('Updating ' + id);

      let payload = req.body;

      if (payload.todoId !== id) {
        return res.status(400).end();
      }

      // Create a document and then insert it
      let document = await todoEntity.load({todoId: id});

      await todoEntity.update(document, () => {
        document.todoId = payload.todoId;
        document.priority = payload.priority;
        document.title = payload.title;
        document.body = payload.body;
        document.due = new Date(payload.due);
        document.completed = !!payload.completed;
      });
      res.status(200).end();
    } catch (err) {
      console.dir(err);
      if (err.code === 'PGEntityNotFoundError') {
        return res.status(400).end();
      }
      return res.status(500).end();
    }
  });

  app.delete('/todo/:id', async (req, res) => {
    try {
      let id = req.params.id;
      debug('Removing ' + id);
      let document = await todoEntity.load({todoId: id});
      await todoEntity.remove(document);
      res.status(200).end();
    } catch (err) {
      if (err.code === 'PGEntityNotFoundError') {
        return res.status(400).end();
      }
      return res.status(500).end();
    }
  });

  await new Promise((resolve, reject) => {
    app.listen(port, err => {
      if (err) {
        reject(err);
      }
      debug(`Listening on port ${port}`);
      resolve();
    });
  });
}

if (cluster.isMaster) {
  console.log(`Master ${process.pid} is running`);

  // Fork workers.
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`worker ${worker.process.pid} died`);
    cluster.fork();
  });
} else {
  main().then(() => {
    console.log(`Worker ${process.pid} started`);
  }, console.error);
}
