let express = require("express");
let bodyParser = require("body-parser");
let logger = require("morgan");
let mongoose = require("mongoose");
let Note = require("./models/Note.js");
let Article = require("./models/Article.js");
let request = require("request");
let cheerio = require("cheerio");

mongoose.Promise = Promise;

let app = express();

app.use(logger("dev"));
app.use(bodyParser.urlencoded({
    extended: false
}));

app.disable('etag');
app.use("/public", express.static("public"));


// let JAWSDB_URL = 'mysql://tqjqz9puh46oi2je:r2vlfoqf7llnlllx@l6slz5o3eduzatkw.cbetxkdyhwsb.us-east-1.rds.amazonaws.com:3306/cpxnrdqyuv7fsjhp'
// mongoose.connect('mongodb://localhost:27017/nytreact', { useMongoClient: true })
mongoose.connect("mongodb://heroku_g9n4kfsw:5tf31qpnk94lchpucs41fvc6df@ds129144.mlab.com:29144/heroku_g9n4kfsw");

let http = require('http');
let PORT = process.env.PORT || 3007


app.get("/", function(req, res) { 
    res.redirect("/public/index.html");
});

let result = [];
app.get("/scrape", function(req, res) { 
    request("https://www.nytimes.com/", function(error, response, html) {
        let $ = cheerio.load(html);

        $("article h2").each(function(i, element) {

            let newArt = {
                id: i,
                title: $(this).children("a").text(),
                link: $(this).children("a").attr("href")
            };
            result.push(newArt);
        });
        console.log("Scraped The New York Times.");
        res.send(result);
        console.log(result);
    });
});
app.get("/scrapehomepage", function(req, res){
    request("http://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml", function(error, response, html) {
        let $ = cheerio.load(html);

        let mainChildren = $._root.children[2].children[1].children[5].children[1].children;
        for(let i = 0; i < mainChildren.length; i++){
            let item = mainChildren[i];
            if(item.type == "tag" && item.name == "item"){
                let title = "";
                let link = "";
                let itemComponents = item.children;
                for(let n = 0; n < itemComponents.length; n++){
                    if(itemComponents[n].type == "tag"){
                        if(itemComponents[n].name == "title"){
                            title = itemComponents[n].children[0].data
                        }
                        if(itemComponents[n].name == "link"){
                            link = itemComponents[n].next.data;
                        }
                    }
                }
                let newArt = {
                    id: i,
                    title: title,
                    link: link
                };
                result.push(newArt);
            }
        }
        res.send(result);
    });
});

// all json articles
app.get("/articles", function(req, res) {
    Article.find({}, function(error, doc) {
        if (error) {
            console.log(error);
        } else {
            res.send(doc);
        }
    });
});


// find an article by id
app.get("/articles/:id", function(req, res) {
    Article.findOne({ "_id": req.params.id })
        .populate("note")
        .exec(function(error, doc) {
            if (error) {
                console.log(error);
            } else {
                res.json(doc);
            }
        });
});

// find a note by id
app.get("/articles/note/:id", function(req, res) {
    Note.findOne({ "_id": req.params.id })
        .populate("note")
        .exec(function(error, doc) {
            if (error) {
                console.log(error);
            } else {
                res.json(doc);
            }
        });
});


// // find an article
app.post("/articles/:id", function(req, res) {
    let newNote = new Note(req.body);
    newNote.save(function(error, doc) {
        if (error) {
            console.log(error);
        } else {
            Article.findOneAndUpdate({ "_id": req.params.id }, { "note": doc._id })
                .exec(function(err, doc) {
                    if (err) {
                        console.log(err);
                    } else {
                        res.send(doc);
                    }
                });
        }
    });
});

// saved articles
app.get("/savednotes", function(req, res) {
        Note.find({})
            .populate("note")
            .exec(function(error, doc) {
                if (error) {
                    res.send(error);
                } else {
                    res.send(doc);
                }
            });
});

app.get("/delete/:id", function(req, res) {
    Note.findByIdAndRemove({ "_id": req.body.id }, function(err, newdoc) {
        if (err) {
            res.send(err);
        } else {
            res.send(newdoc);
        }
    });

});

// connection
app.listen(3007, function() {
    console.log("App running on port 3007!");
});