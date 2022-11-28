const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const { query } = require('express');
const app = express();
const port = process.env.PORT || 5000;

const stripe = require('stripe')(process.env.STRIPE_KEY);


// middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection 
const uri = `mongodb+srv://${process.env.USER_NAME}:${process.env.USER_PASSWORD}@cluster0.zn49gp5.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


const VerifyJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if(!authHeader){
        return res.status(401).send("Unauthorized Access");
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.USER_ACCESS_TOKEN, function(err, decoded){
        if(err){
            return res.status(401).send("Unauthorized Access");
        }
        req.decoded = decoded;
        next();
    })
  }

async function run(){
    try{
        const usersCollection = client.db('sellZoneDB').collection('usersCollection');
        const catagory = client.db('sellZoneDB').collection('catagory');
        const phonesCollection = client.db('sellZoneDB').collection('phonesCollection');
        const cartCollection = client.db('sellZoneDB').collection('cartCollection');
        const verifyRequestColletion = client.db('sellZoneDB').collection('verifyRequestColletion');
        const advertiseColletion = client.db('sellZoneDB').collection('advertiseColletion');
        const reportColletion = client.db('sellZoneDB').collection('reportColletion');
        const paymentsCollection = client.db('sellZoneDB').collection('paymentsCollection');


        //Verify Admin
        const verifyAdmin = async (req, res, next) => {
            const adminEmail = req.decoded.email;
            const filter = {email: adminEmail};
            const user = await usersCollection.findOne(filter);

            if(user?.role !== "admin"){
               return res.status(403).send({message: "Forbiden Access"});
            }
            next();
        }


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

        //Get Cart products
        app.get('/cart/products/:email', async(req, res) => {
            const email = req.params.email;
            const query = {email: email};
            const result = await cartCollection.find(query).toArray();
            res.send(result);
        })

        //Get cart item by id
        app.get('/cart/:id', async(req, res) => {
            const id = req.params.id;
            const filter = {_id: ObjectId(id)};
            const result = await cartCollection.findOne(filter);
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

        //Payment 
        app.post('/create-payment-intent', async(req, res) => {
            const cartItem = req.body;
            const price = parseInt(cartItem.price);
            const amount = price * 100;

            const paymentIntent = await stripe.paymentIntents.create({
                currency: 'usd',
                amount: amount,
                "payment_method_types" : [
                    "card"
                ]
            });

            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        });

        app.post('/cart/payments', async(req, res) => {
            const payment = req.body;
            const result = await paymentsCollection.insertOne(payment);

            //Updating cart item after payment success
            const id = payment.cartId;
            const filter = {_id: ObjectId(id)};
            const updatedDoc = {
                $set:{
                    paid: true,
                }
            }
            const updatedCartItem = await cartCollection.updateOne(filter, updatedDoc);

            //Update product status aviable to sold
            const productId = payment.productId;
            const productQuery = {_id:ObjectId(productId)};
            const updatedProductDoc = {
                $set: {
                    status: 'sold',
                    isAdvertising: false
                }
            }

            const updatedProductResult = await phonesCollection.updateOne(productQuery, updatedProductDoc);

            //Delete this item from Advertise collection
            const adId = payment.productId;
            const adFilter = {productId: adId};
            const deletedResult = await advertiseColletion.deleteOne(adFilter);
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
        app.get('/users/buyers', VerifyJWT, verifyAdmin, async(req, res) => {
            const filter = {role:'buyer'};
            const result = await usersCollection.find(filter).toArray();
            res.send(result);
        })

        //Get all sellers
        app.get('/users/sellers', VerifyJWT, verifyAdmin, async(req, res) => {
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
        app.put('/request/accept/:email', VerifyJWT, verifyAdmin, async(req, res) => {
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

        //Delete request form db collection
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
        app.get('/my_products/:email', VerifyJWT, async(req, res) => {
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

      //post report to admin
      app.post('/report', async(req, res) => {
        const report = req.body;
        const result = await reportColletion.insertOne(report);
        res.send(result);
      })

      //get report by admin
      app.get('/reports/all', async(req, res) => {
        const query = {};
        const result = await reportColletion.find(query).toArray();
        res.send(result);
      })

      //Delete reported item by admin
      app.post('/report/delete', VerifyJWT, verifyAdmin, async(req, res) => {
        const report = req.body;
        const reportId = report._id;
        const reportFilter = {_id:ObjectId(reportId)};
        const reportDeleteResult = await reportColletion.deleteOne(reportFilter);

        //After deleteting report from report collection 
        //Delete this product form product collection
        const productId = report.productId;
        const productFilter = {_id:ObjectId(productId)};
        const deletedProductResult = await phonesCollection.deleteOne(productFilter);
        res.send(reportDeleteResult);
      })


      //jwt VERIFY process
      app.get('/jwt', async(req, res) => {
        const email = req.query.email;
        const query = {email: email};
        const user = await usersCollection.findOne(query);
        if(user && user?.email){
          const token = jwt.sign(user, process.env.USER_ACCESS_TOKEN,{expiresIn:'5d'});
          return res.send({accessToken: token});
        }
        res.status(401).send("Unauthorized");
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