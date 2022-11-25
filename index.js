const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');
const jwt = require('jsonwebtoken');
const app = express();
const port = process.env.PORT || 5000;


// middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection 
const uri = `mongodb+srv://${process.env.USER_NAME}:${process.env.USER_PASSWORD}@cluster0.zn49gp5.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run(){
    try{
        const usersCollection = client.db('sellZoneDB').collection('usersCollection');
        const catagory = client.db('sellZoneDB').collection('catagory');
        const phonesCollection = client.db('sellZoneDB').collection('phonesCollection');

        app.post('/add_user', async(req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.send(result);
        })

        app.put('/add/newuser', async(req, res) => {
            const user = req.body;
            const filter = {email: user.email};
            const option = {upsert: true};
            const updatedDoc = {
                $set: {
                    name: user.name,
                    img: user.img,
                    role: 'buyer'
                }
            }
            const result = await usersCollection.updateOne(filter, updatedDoc, option);
            res.send(result);
        })

        app.get('/catagory', async(req, res) => {
            const query = {};
            const result = await catagory.find(query).toArray();
            res.send(result);
        })

        app.get('/all/phones', async(req, res) => {
            const query = {};
            const result = await phonesCollection.find(query).toArray();
            res.send(result);
        })

        app.get('/phones/:cataId', async(req, res) => {
            const cataId = req.params.cataId;
            const filter = {cataId: cataId};
            const result = await phonesCollection.find(filter).toArray();
            res.send(result);
        })

        app.get('/catagory/:cataId', async(req, res) => {
            const cataId = req.params.cataId;
            const query = {cataId: cataId};
            const result = await catagory.findOne(query);
            res.send(result);
        })

    }
    finally{

    }
}
run().catch(err => console.error(err));

app.get('/', (req, res) => {
    res.send('Sell Zone Server running');
})

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
})