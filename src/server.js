require('dotenv').config();

const express = require('express');
const { Update } = require('faunadb');
const faunadb = require('faunadb');
const app = express();

const PORT = process.env.PORT || 5000;

const client = new faunadb.Client({
	secret: process.env.FAUNADB_SECRET,
	domain: process.env.FAUNADB_DOMAIN || 'db.fauna.com'
});

const {
	Collection,
	Create,
	Delete,
	Get,
	Index,
	Lambda,
	Map,
	Match,
	Paginate,
	Ref,
	Select,
	Var,
} = faunadb.query;

app.use(express.json());

app.get('/tasks', async (_req, res) => {
	try {
		const { data: tasks } = await client.query(
			Map(
				Paginate(
					Match(
						Index('all_tasks')
					),
					{ size: 15 }
				),
				Lambda(
					'task',
					{
						id: Select(['ref', 'id'], Get(Var('task'))),
						ts: Select(['ts'], Get(Var('task'))),
						text: Select(['data', 'text'], Get(Var('task'))),
						done: Select(['data', 'done'], Get(Var('task')))
					}
				)
			)
		);

		return res.json(tasks);
	} catch({ message }) {
		return res.json({ error: message });
	}
});

app.get('/tasks/:id', async (req, res) => {
	try {
		const task = await client.query(
			Get(Ref(Collection('tasks'), req.params.id))
		);

		return res.json({
			id: task.ref.id,
			ts: task.ts,
			...task.data
		});
	} catch ({ message }) {
		return res.json({ error: message });
	}
});

app.post('/tasks', async (req, res) => {
	const { text } = req.body;

	try {
		const createdTask = await client.query(
			Create(
				Collection('tasks'),
				{
					data: {
						text,
						done: false
					}
				}
			)
		);

		
		return res.json({
			id: createdTask.ref.id,
			ts: createdTask.ts,
			...createdTask.data
		});
	} catch ({ message }) {
		return res.json({ error: message });
	}
});

app.delete('/tasks/:id', async (req, res) => {
	try {
		await client.query(
			Delete(Ref(Collection('tasks'), req.params.id))
		);

		return res.status(200).end();
	} catch ({ message }) {
		return res.json({ error: message });
	}
});

app.patch('/tasks/:id', async (req, res) => {
	try {
		const updatedTask = await client.query(
			Update(
				Ref(Collection('tasks'), req.params.id),
				{
					data: {
						text: req.body.text
					}
				}
			)
		);

		return res.json({
			id: updatedTask.ref.id,
			ts: updatedTask.ts,
			...updatedTask.data
		});
	} catch ({ message }) {
		return res.json({ error: message });
	}
});

app.listen(PORT, console.log('Server is running'));