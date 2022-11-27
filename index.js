const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const { query } = require('express');
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
        const cartCollection = client.db('sellZoneDB').collection('cartCollection');
        const verifyRequestColletion = client.db('sellZoneDB').collection('verifyRequestColletion');
        const advertiseColletion = client.db('sellZoneDB').collection('advertiseColletion');
        const reportColletion = client.db('sellZoneDB').collection('reportColletion');

        //Adding user to database when register
        app.post('/add_user', async(req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.send(result);
        })

        //Add item in cart
        app.post('/addCart', async(req, res) => {
            const item = req.body;
            const result = await cartCollection.insertOne(item);
            res.send(result);
        })


        //Posting seller profile verification request
        app.post('/seller/verify_req', async(req, res) => {
            const request = req.body;
            const result = await verifyRequestColletion.insertOne(request);
            res.send(result);
        })

        //Add product to databsae
        app.post('/add/product', async(req, res) => {
            const product = req.body;
            const result = await phonesCollection.insertOne(product);
            res.send(result);
        })

        //add Advertise Items to database
        app.post('/advertise/add', async(req, res) => {
            const item = req.body;
            const result = await advertiseColletion.insertOne(item);
            res.send(result);
        })

        //adding user when Logging with Google
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

        //Geting Catagory for product
        app.get('/catagory', async(req, res) => {
            const query = {};
            const result = await catagory.find(query).toArray();
            res.send(result);
        })

        //Get All Phones from database
        app.get('/all/phones', async(req, res) => {
            const query = {};
            const result = await phonesCollection.find(query).toArray();
            res.send(result);
        })

        //Get Phone by Category id
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


        //Get Single phone by id
        app.get('/all/phones/:id', async(req, res) => {
            const id = req.params.id;
            const filter = {_id:ObjectId(id)}
            const result = await phonesCollection.findOne(filter);
            res.send(result);
        })


        //Checking is user admin
        app.get('/user/admin/:email', async(req, res) => {
            const email = req.params.email;
            const query = {email: email};
            const user = await usersCollection.findOne(query);
            res.send({isAdmin: user?.role === 'admin'});
          })

        //Checking is user seller
        app.get('/user/seller/:email', async(req, res) => {
            const email = req.params.email;
            const query = {email: email};
            const user = await usersCollection.findOne(query);
            res.send({isSeller: user?.role === 'seller'});
          })

        //get all buyers
        app.get('/users/buyers', async(req, res) => {
            const filter = {role:'buyer'};
            const result = await usersCollection.find(filter).toArray();
            res.send(result);
        })

        //Get all sellers
        app.get('/users/sellers', async(req, res) => {
            const filter = {role:'seller'};
            const result = await usersCollection.find(filter).toArray();
            res.send(result);
        })

        //get seller by id
        app.get('/seller/:email', async(req, res) => {
            const email = req.params.email;
            const query = {email: email};
            const user = await usersCollection.findOne(query);
            res.send({isVerified: user?.status === 'verified'});
        })

        //Checking is user sent verify req
        app.get('/seller/request/:email', async(req, res) => {
            const email = req.params.email;
            const query = {seller: email};
            const request = await verifyRequestColletion.findOne(query);
            res.send({isPending: request?.seller === email })
        })

        app.get('/verify/request', async(req, res) => {
            const query = {};
            const result = await verifyRequestColletion.find(query).toArray();
            res.send(result);
        })

        //Accepting user verify
        app.put('/request/accept/:email', async(req, res) => {
            const email = req.params.email;
            const filter = {email: email};
            const option = {upsert: true};
            const updatedDoc = {
                $set: {
                    status: 'verified'
                }
            }
            const result = await usersCollection.updateOne(filter, updatedDoc, option);
            res.send(result);
        })

        //Delete request form db colection
        app.delete('/request/delete/:id', async(req, res) => {
            const id = req.params.id;
            const filter = {_id: ObjectId(id)};
            const result = await verifyRequestColletion.deleteOne(filter);
            res.send(result);
        })

        //Delete seller product
        app.delete('/delete/:id', async(req, res) => {
            const id = req.params.id;
            const filter = {_id: ObjectId(id)};
            const result = await phonesCollection.deleteOne(filter);
            res.send(result);
        })

        //Delete Seller
        app.delete('/sellers/:id', async(req, res) => {
            const id = req.params.id;
            const filter = {_id: ObjectId(id)};
            const result = await usersCollection.deleteOne(filter);
            res.send(result);
        })

        // //Delete User
        app.delete('/users/:id', async(req, res) => {
            const id = req.params.id;
            const filter = {_id: ObjectId(id)};
            const result = await usersCollection.deleteOne(filter);
            res.send(result);
        })

        //Get Seller Products by seller email
        app.get('/my_products/:email', async(req, res) => {
            const email = req.params.email;
            const filter = {sellerEmail: email};
            const result = await phonesCollection.find(filter).toArray();
            res.send(result);
        })

        //Get advertise item form database
        app.get('/advertise/item', async(req, res) => {
            const query = {};
            const result = await advertiseColletion.find(query).toArray();
            res.send(result);
        })

        //Get advertise item form database
        app.get('/running/add', async(req, res) => {
            const query = {};
            const result = await advertiseColletion.find(query).toArray();
            res.send({isRunning: result.length === 1});
        })

        //when seller gointo to make product Advertise, update the original
        //product isAdvertising true
        app.put('/advertise/start/:id', async(req, res) => {
            const id = req.params.id;
            const filter = {_id: ObjectId(id)};
            const option = {upsert: true};
            const updatedDoc = {
            $set: {
                isAdvertising: true
            }
            }
            const result = await phonesCollection.updateOne(filter, updatedDoc, option);
            res.send(result);
      })

        //when seller gointo to stop product Advertise, update the original
        //product isAdvertising false
        app.put('/advertise/stop/:id', async(req, res) => {
            const id = req.params.id;
            const filter = {_id: ObjectId(id)};
            const option = {upsert: true};
            const updatedDoc = {
            $set: {
                isAdvertising: false
            }
            }
            const result = await phonesCollection.updateOne(filter, updatedDoc, option);
            res.send(result);
      })


      //Delete Advertise data from database when seller stop Advertise
      app.delete('/advertise/delete', async(req, res) => {
        const filter = {};
        const result = await advertiseColletion.deleteMany(filter);
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