
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

async function main() {
  let createOrDrop = process.argv[2];
  let connectionString = process.argv[3] || process.env.DATABASE_URL;
  console.log('Connecting to :', connectionString);
  let manager = createEntityManager({connectionString});
  try {
    if (createOrDrop === 'create') {
      console.log(createOrDrop);
      await manager.createSchema();
    } else if (createOrDrop === 'drop') {
      console.log(createOrDrop);
      await manager.dropSchema();
    } else {
      throw new Error('Must specify create or drop');
    }
  } finally {
    await manager.close();
    console.log('Done!');
  }
}

module.exports = {todoEntity, createEntityManager};

if (!module.parent) {
  main().catch(console.error);
}
