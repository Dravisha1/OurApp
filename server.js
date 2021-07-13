const ejs = require("ejs");
const moment = require('moment');
const fs = require('fs');
const express = require('express');
const bodyParser = require('body-parser');
const alert = require('alert');
const mongoose = require('mongoose');
var methodOverride = require('method-override');
const db_url = 'mongodb+srv://dravisha:dravi@cluster0.gli4q.mongodb.net/myFirstDatabase?retryWrites=true&w=majority';
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const PORT = process.env.PORT || 3000;
const User = require('./models/user');
const Post = require('./models/post');
const { error } = require("console");
const { SSL_OP_SSLEAY_080_CLIENT_DH_BUG } = require("constants");
const { Db } = require("mongodb");
const { ChangeStream } = require("mongodb");

var user = '';

mongoose.connect(db_url, { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true, useFindAndModify: false })
    .then(() => { console.log("Mongo database connected"); })
    .catch(e => { console.log("Could not connect Mongo!!", e); });
app.get('/', (req, res) => {
    res.render('guest');
});

app.get('/login', (req, res) => {
    if (user.online === true) { res.render('dashboard'); }
    else alert("User not logged in..");
});

app.get('/dashboard', async (req, res) => {
    if (user.online === true) {
        var followingList = await user.following;
        const aPosts = await Post.find();
        var allPosts = [];
        for (var i = 0; i < aPosts.length; i++) {
            if (isInside(aPosts[i].author, followingList)) allPosts.push(aPosts[i]);
        }
        allPosts.reverse();
        await res.render('dashboard', { allPosts, user });
    }
    else {
        alert("User not logged in..");
        res.render('guest')
    }
});

app.get('/edit', (req, res) => {
    if (user.online === true) { res.render('edit'); }
    else {
        alert("User not logged in..");
        res.render('guest')
    }
});

app.get('/register', (req, res) => {
    if (user.online === true) { myPosts(req, user); }
    else {
        alert("User not logged in..");
        res.render('guest')
    }
});

app.get('/newpost', (req, res) => {
    if (user.online === true) { res.render('post', { user }); }
    else {
        alert("User not logged in..");
        res.render('guest')
    }
});

app.get('/profile', async (req, res) => {
    if (user.online === true) {
        const posts = await Post.find({ author: user.name });
        posts.reverse();
        res.render('profile', { user, posts });
    }
    else {
        alert("User not logged in..");
        res.render('guest')
    }
});

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.use(express.static(__dirname + '/public'));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(methodOverride('_method'))


app.post('/register', async (req, res) => {
    try {
        var cpassword = req.body.confirmpassword;
        var password = req.body.password;
        if (password === cpassword) {
            const registerUser = new User(req.body);
            user = await registerUser.save();
            const changeStatus = await User.findOneAndUpdate({ name: user.name }, { online: true }, { new: true });
            user = changeStatus;
            try {
                console.log(req.body);
                const posts = await Post.find({ author: user.name });
                posts.reverse();
                res.render('profile', { user, posts });
            }
            catch {
                alert(error.message)
                console.log(error);
            }
        }
        else {
            alert("The passwords dont match:(");
        }
    }
    catch {
        res.status(400).send(error);
    }
});

app.post('/login', async (req, res) => {
    try {
        var name = req.body.name;
        var password = req.body.password;
        user = await User.findOne({ name: name });
        if (user.password === password) {
            const changeStatus = await User.findOneAndUpdate({ name: user.name }, { online: true }, { new: true });
            user = changeStatus;
            var followingList = await user.following;
            const aPosts = await Post.find();
            var allPosts = [];
            for (var i = 0; i < aPosts.length; i++) {
                if (isInside(aPosts[i].author, followingList)) allPosts.push(aPosts[i]);
            }
            allPosts.reverse();
            res.render('dashboard', { allPosts, user });
        }
        else {
            alert('Incorrect Password');
            res.render('guest');
        }
    }
    catch { 
        alert("No such user found!!"); 
        res.render('guest');
        console.log(error); 
    }
});

app.post('/editting/:id', async (req, res) => {
    if (user.online === true) {
        const { id } = req.params;
        const post = await Post.findById(id);
        res.render('edit', { post });
    }
    else {
        alert("User not logged in..");
        res.render('guest')
    }
});

app.post('/newpost', async (req, res) => {
    if (user.online === true) res.render('post', { user });
    else {
        alert("User not logged in..");
        res.render('guest')
    }
});

app.post('/dashboard', async (req, res) => {
    if (user.online === true) {
        try {
            var title = req.body.title;
            var content = req.body.content;
            var author = user.name;
            if (title === "" || content === "") {
                alert("Both fields are mandatory");
            }
            else {
                try {
                    const newPost = new Post({
                        author: author,
                        title: title,
                        content: content
                    });
                    const post = await newPost.save();
                    try {
                        const posts = await Post.find({ author: user.name });
                        posts.reverse();
                        res.render('profile', { user, posts });
                    }
                    catch { alert(error.message); console.log(error) }
                }
                catch { alert(error.message); console.log(error); }
            }
        }
        catch { alert(error.message); console.log(error); }
    }
    else {
        alert("User not logged in..");
        res.render('guest')
    }
});

app.post('/edit/:id', async (req, res) => {
    if (user.online === true) {
        const { id } = req.params;
        const post = await Post.findById(id);
        res.render('edit', { post });
    }
    else {
        alert("User not logged in..");
        res.render('guest')
    }
});

app.post('/postedit/:id', async (req, res) => {
    if (user.online === true) {
        const { id } = req.params;
        const update = await Post.findOneAndUpdate({ _id: id }, {
            title: req.body.title,
            content: req.body.content
        });
        try {
            myPosts(res);
        }
        catch { alert(error.message); console.log(error); }
    }
    else {
        alert("User not logged in..");
        res.render('guest')
    }
});

app.post('/delete/:id', async (req, res) => {
    if (user.online === true) {
        const { id } = req.params;
        const deletePost = await Post.deleteOne({ _id: id });
        try { myPosts(res) }
        catch { alert(error.message); console.log(error); }
    }
    else {
        alert("User not logged in..");
        res.render('guest')
    }
})

app.post('/searchuser', async (req, res) => {
    if (user.online === true) {
        const findName = req.body.search;
        const findUser = await User.findOne({ name: findName });
        try {
            const posts = await Post.find({ author: findName });
            posts.reverse();
            var followerList = await findUser.followers;
            var isFollowing = 0;
            for (var i = 0; i < followerList.length; i++) {
                if (followerList[i] === user.name) {
                    isFollowing = 1;
                    break;
                }
            }
            res.render('searchprofile.ejs', { findUser, posts, isFollowing });
        }
        catch {
            alert("No such user found!!")
        }
    }
    else {
        alert("User not logged in..");
        res.render('guest')
    }
});

app.post('/followUser/:id', async (req, res) => {
    if (user.online === true) {
        const { id } = req.params;
        const findUser = await User.findById(id);
        var followerList = await findUser.followers;
        var isFollowing = 0;
        for (var i = 0; i < followerList.length; i++) {
            if (followerList[i] === user.name) {
                isFollowing = 1;
                break;
            }
        }
        if (isFollowing === 0) {
            followerList.push(user.name);
            const updateFollowers = await User.findOneAndUpdate({ name: findUser.name }, {
                followers: followerList
            });
            var followingList = await user.following;
            followingList.push(findUser.name);
            const updateFollowing = await User.findOneAndUpdate({ name: user.name }, {
                following: followingList
            });
            const posts = await Post.find({ author: findUser.name });
            res.render('searchprofile', { findUser, posts, isFollowing });
        }
        else {
            res.render('searchprofile.ejs', { findUser, posts, isFollowing });
        }
    }
    else {
        alert("User not logged in..");
        res.render('guest')
    }
});

app.post('/signout', async (req, res) => {
    if (user.online === true) {
        const changeStatus = await User.findOneAndUpdate({ name: user.name }, { online: false }, { new: true });
        user = changeStatus;
        res.render('guest');
    }
    else {
        alert("User not logged in..");
        res.render('guest')
    }
})

app.post('/chat/:id', async (req, res) => {
    if (user.online === true) {
        const { id } = req.params;
        const findUser = await User.findById(id);
        var followerList = await findUser.followers;
        var isFollowing = 0;
        for (var i = 0; i < followerList.length; i++) {
            if (followerList[i] === user.name) {
                isFollowing = 1;
                break;
            }
        }
        const posts = await Post.find({ author: findUser.name });
        if (findUser.online === true) {
            res.render('chat', { user, findUser });
        }
        else {
            alert(`${findUser.name} is offline..`);
            res.render('searchprofile.ejs', { findUser, posts, isFollowing });
        }
    }
    else {
        alert("User not logged in..");
        res.render('guest')
    }
})

app.post('/:id', async (req, res) => {
    if (user.online === true) {
        const { id } = req.params;
        console.log(id);
        const post = await Post.findById(id);
        res.render('edit', { post });
    }
    else alert("Login in to continue.")
});

function isInside(value, array) {
    let l = array.length;
    for (var i = 0; i < l; i++) {
        if (value === array[i]) return true;
    }
    return false;
}

async function myPosts(res) {
    const posts = await Post.find({ author: user.name });
    posts.reverse();
    res.render('profile', { user, posts });
}

io.on('connection', (socket) => {
    console.log('a user connected');
    socket.on('disconnect', () => {
      console.log('user disconnected');
    });
    socket.on('chat message', (msg) => {
        console.log( user.name + ": " + msg);
        io.emit('chat message', msg);
      });
  });

server.listen(PORT, () => {
    console.log(`Listening on PORT ${PORT}`)
});

