# Example Postgres Entities application
This application is a simple todo list application which serves
as an example implementation of the postgres-entities library.

## Running locally
This README does not cover setup of Postgres and makes the following assumptions:

1. The superuser (admin) user for the database cluster is 'postgres'
1. The authentication method 'trust' is used on the localhost
1. Postgres is running on 127.0.0.1:5432

The first step of starting the service is to initialise the required database
objects.  These can be created with the following commands:

```shell
# Assuming 'postgres' is your admin user
pgAdminUser=postgres
todoUser=todouser
todoDB=tododb

createuser -U $pgAdminUser $todoUser
createdb -U $pgAdminUser --owner $todoUser $todoDB

export DATABASE_URL="postgres://${todoUser}@localhost:5432/${todoDB}"
export ADMIN_DATABASE_URL="postgres://${pgAdminUser}@localhost:5432/${todoDB}"

node entities drop
node entities create
```

The service can be started with the following commands:

```shell
# Use the same DATABASE_URL from initialization
export DATABASE_URL="postgres://todouser@localhost:5432/tododb"

export PORT=5555

node service
```

## Running on Heroku
This repository is set up to be easy to deploy to Heroku.  It has
a proc file.  Assuming the Heroku tools are installed locally,
this app can be start by running the following commands:

```shell
heroku apps:create
heroku addons:create heroku-postgresql:hobby-dev
export DATABASE_URL="$(heroku config:get DATABASE_URL)?ssl=true"

# Need to create database objects
node entities drop
node entities create

git push heroku master -f
```

# Generating load
There is a script included which can put a lot of load on the service.
This script can be run with

```shell

export SVC_HOSTNAME='localhost' # change as appropriate
export SVC_PORT=5555 # change as appropriate

node load_runner
```
