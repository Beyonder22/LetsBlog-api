import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import User from './User.js';
import Post from './Post.js';
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken';
import cookieParser  from 'cookie-parser';
import multer from 'multer';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

const salt = bcrypt.genSaltSync(10);
const secret = 'dfasvcac33cdcafv3';
const uploadMiddleware = multer({dest:'uploads/'});

const port = process.env.PORT || 9000
app.use(cors({credentials:true, origin:'http://localhost:3000'}));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads',express.static(__dirname + '/uploads'));

const connection_url = 'mongodb+srv://ak6401790:L2WIjx3pywa7CQ3Z@cluster0.ilwhgjb.mongodb.net/?retryWrites=true&w=majority&appName=AtlasApp';

mongoose.connect(connection_url, {

});

app.get('/',(req,res)=>{
	res.status(200).send('ok');
})

app.post('/register',(req,res)=>{
	const {username, password} = req.body;
	User.create({
		username,
		password: bcrypt.hashSync(password,salt),
	})
	.then((data)=>{
		res.status(200).send(data)
	})
	.catch((err)=>{
		res.status(500).send(err.message);
	})
	// res.json({requestData:{username, password}});
});

app.post('/login', async (req,res)=>{
	const {username, password} = req.body;
	const userDoc = await User.findOne({username});
	if(password === null)
		res.status(400).send('wrong credentials');
	const passOk = bcrypt.compareSync(password,userDoc.password);
	if(passOk){
		jwt.sign({username, id:userDoc._id}, secret, {}, (err,token)=> {
			if(err) throw err;
			res.cookie('token',token).json({
				id:userDoc._id,
				username,});
		});
	}else{
		res.status(400).send('wrong credentials');
	}
})
app.get('/profile',(req,res)=>{
	const {token} = req.cookies;
	if(token==='')
		res.json('ok')
	else {
	jwt.verify(token,secret,{},(err,info)=>{
		if(err) throw err;
		res.json(info);
	});
}
});
app.post('/logout',(req,res)=>{
	res.cookie('token','').json('ok');
})
app.post('/post',uploadMiddleware.single('file'),async (req,res)=>{
	const {originalname, path} = req.file;
	const parts = originalname.split('.');
	const ext = parts[parts.length-1];
	const newPath = path+'.'+ext
	fs.renameSync(path,newPath);
	const {token} = req.cookies;
	jwt.verify(token,secret,{},async (err,info)=>{
		if(err) throw err;
		const {title,summary,content} = req.body;
		const postDoc = await Post.create({
			title,
			summary,
			content,
			cover:newPath,
			author:info.id,
		})
	res.json(postDoc);
	});
});

app.put('/post',uploadMiddleware.single('file'),async (req,res)=>{
	let newPath = null;
	if(req.file){
		const {originalname, path} = req.file;
		const parts = originalname.split('.');
		const ext = parts[parts.length-1];
		newPath = path+'.'+ext
		fs.renameSync(path,newPath);
	}
	const {token} = req.cookies;
	jwt.verify(token,secret,{},async (err,info)=>{
		if(err) throw err;
		const {id,title,summary,content} = req.body;
		const postDoc = await Post.findById(id);
		const isAuthor = JSON.stringify(postDoc.author) === JSON.stringify(info.id);
		if(!isAuthor){
			return  res.status(400).json('you are not the author');
		} 
		await postDoc.updateOne({title,summary,content,cover:newPath?newPath:postDoc.cover});
		res.json(postDoc);
	});
});

app.get('/post/:id',async (req,res)=>{
	const {id} = req.params;
	const postDoc = await Post.findById(id).populate('author',['username']);
	res.json(postDoc);
})

app.get('/post', async (req,res)=>{
	res.json( await Post.find().populate('author',['username']).sort({createdAt:-1}).limit(20));
})

app.listen(port,()=>console.log('Listening on local host on port: '+port));

//mongodb+srv://ak6401790:L2WIjx3pywa7CQ3Z@cluster0.ilwhgjb.mongodb.net/?retryWrites=true&w=majority&appName=AtlasApp