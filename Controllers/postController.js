const express=require('express');
const Post=require('../modules/postSchema')


const handlePostsRequest=async(req,res)=>{
  const post=req.body.body;
  const results=await Post.find();

  res.status(200).json({results})
}

module.exports={handlePostsRequest}