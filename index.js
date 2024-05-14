const express = require('express');
const cors = require('cors');
require('dotenv').config()
const app = express();
const port = process.env.PORT || 5000;

//middlewares
app.use(cors());
app.use(express.json());



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.1towayy.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        const productCollection = client.db("productsDB").collection("boycotts");
        const recommendCollection = client.db("productsDB").collection("recommendations");

        app.post('/addQuery', async (req, res) => {
            const item = req.body;
            const result = await productCollection.insertOne(item);
            res.send(result);
        })

        app.post('/recommendProduct', async (req, res) => {
            const item = req.body;
            console.log(item.linkID);
            const filterItem = { _id: new ObjectId(item.linkID) };

            const update = await productCollection.updateOne(filterItem, { $inc: { recommendationCount: 1 } })

            const result = await recommendCollection.insertOne(item);
            res.send(result);
        })

        app.get('/allProducts', async (req, res) => {
            const result = await productCollection.find().sort({ addingDate: -1 }).toArray();
            res.send(result);
        })

        app.get('/viewRecommendations/:id', async (req, res) => {
            const id = req.params.id;
            // console.log(id);
            const filter = { linkID: id };
            const result = await recommendCollection.find(filter).toArray();
            res.send(result);
        })

        app.get('/myRecommendation', async (req, res) => {
            const check = req.query.email;
            const query = { rEmail: check };
            const result = await recommendCollection.find(query).toArray();
            res.send(result);
        })

        app.get('/myQueries', async (req, res) => {
            const usermail = req.query.email;
            const filter = { userEmail: usermail };
            const result = await productCollection.find(filter).sort({ addingDate: -1 }).toArray();
            res.send(result);
            // console.log(user);
        })

        app.get('/productDetails/:id', async (req, res) => {
            const id = req.params.id;
            // console.log(id);
            const filter = { _id: new ObjectId(id) };
            const result = await productCollection.findOne(filter);
            res.send(result);
        })

        app.get('/forMe', async (req, res) => {
            const myEmail = req.query.email;
            // console.log(myEmail);
            const query = { userEmail: myEmail };
            const result = await recommendCollection.find(query).toArray();
            res.send(result);
        })

        app.patch('/updateProduct/:id', async (req, res) => {
            const id = req.params?.id;
            console.log(id);
            // console.log(update);
            const update = req?.body;
            const query = { _id: new ObjectId(id) };
            const updatedItem = {
                $set: {
                    productName: update.productName,
                    productBrand: update.productBrand,
                    boycottReason: update.boycottReason,
                    queryTitle: update.queryTitle,
                    productImage: update.productImage
                }
            }
            const result = await productCollection.updateOne(query, updatedItem);
            res.send(result);

        })

        app.delete('/product/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const result = await productCollection.deleteOne(filter);
            res.send(result);
        })

        app.delete('/recommendation/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const link = req.query.link;
            const linkFilter = { _id: new ObjectId(link) };
            const update = await productCollection.updateOne(linkFilter, { $inc: { recommendationCount: -1 } })
            const result = await recommendCollection.deleteOne(filter);
            res.send(result);
        })


        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('server is running for heart-shift')
})

app.listen(port, () => {
    console.log('heart-shift server is running')
})

