
const {
  PGEntityManager,
  PGEntity,
  PGEntityDocument,
  PGIntegerField,
  PGStringField, 
  PGDateField,
  PGBooleanField,
} = require('postgres-entities');

const todoEntity = new PGEntity({
  name: 'todo',
  id: ['todoId'],
  versions: [{
    fields: {
      todoId: PGStringField,
      priority: PGIntegerField,
      title: PGStringField,
      body: PGStringField,
      completed: PGBooleanField,
      due: PGDateField,
    },
  }],
});

function createEntityManager({connectionString}) {
  let manager = new PGEntityManager({
    service: 'todo-list',
    connectionString,
  });
  manager.addEntity(todoEntity);

  return manager;
}

async function runQueries(createOrDrop, connectionString, adminConnectionString) {
  let adminManager = createEntityManager({connectionString: adminConnectionString || connectionString});
  let manager = createEntityManager({connectionString: connectionString});
  let queries;

  if (createOrDrop === 'create') {
    queries = manager.psqlCreateQueries;
  } else if (createOrDrop === 'drop') {
    queries = manager.psqlDropQueries;
  } else {
    throw new Error('Must specify create or drop');
  }

  try {
    await adminManager.write.runInTx(async tx => {
      for (let query of queries) {
        await tx.query(query);
      }
    });
  } finally {
    await manager.close();
    await adminManager.close();
  }

}

async function main() {
  let createOrDrop = process.argv[2];
  let connectionString = process.argv[3] || process.env.DATABASE_URL;
  let adminConnectionString = process.argv[4] || process.env.ADMIN_DATABASE_URL;

  await runQueries(createOrDrop, connectionString, adminConnectionString);
}

module.exports = {todoEntity, createEntityManager};

if (!module.parent) {
  main().catch(console.error);
}
