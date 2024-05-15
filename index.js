const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookies = require('cookie-parser');
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;

//middlewares
app.use(cors({
    origin: ['http://localhost:5173', 'https://a11-client-b9a9f.web.app', 'https://a11-client-b9a9f.firebaseapp.com'],
    credentials: true
}))
app.use(express.json());
app.use(cookies());


const verifyToken = async (req, res, next) => {
    const token = req.cookies?.token;
    console.log('middleware detected token', token);
    if (!token) {
        return res.status(401).send({ message: 'not authorized' });
    }
    jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: 'not authorized' });
        }
        console.log('decoded value in the token', decoded);
        req.user = decoded;
        next();
    })
}


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.1towayy.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const cookieOptions = {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    secure: process.env.NODE_ENV === "production" ? true : false,
};

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        const productCollection = client.db("productsDB").collection("boycotts");
        const recommendCollection = client.db("productsDB").collection("recommendations");

        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
                expiresIn: '1h'
            });
            res.cookie('token', token, cookieOptions).send({ success: true });
        })

        app.post('/logout', (req, res) => {
            const user = req.body;
            console.log('logging out', user);
            res.clearCookie('token', { ...cookieOptions, maxAge: 0 }).send({
                success: true
            })
        })

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

        app.get('/myQueries', verifyToken, async (req, res) => {
            if (req.query.email !== req.user.email) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            let filter = {};
            if (req.query?.email) {
                const usermail = req.query.email;
                filter = { userEmail: usermail };
            }
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
        // await client.db("admin").command({ ping: 1 });
        // console.log("Pinged your deployment. You successfully connected to MongoDB!");
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
    console.log(`heart-shift server is running at ${port}`)
})

