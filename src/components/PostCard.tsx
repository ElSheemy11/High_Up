"use client"

import { createComment, deletePost, getPosts, toggleLike } from '@/actions/post.action';
import { SignInButton, useUser } from '@clerk/nextjs';
import React, { useState } from 'react'
import toast from 'react-hot-toast';
import { Card, CardContent } from './ui/card';
import Link from 'next/link';
import { Avatar, AvatarImage } from './ui/avatar';
import { formatDistanceToNow } from 'date-fns'
import { DeleteAlertDialog } from './DeleteAlertDialog';
import { Button } from './ui/button';
import { HeartIcon, LogInIcon, MessageCircleIcon, SendIcon } from 'lucide-react';
import { Textarea } from './ui/textarea';

type Posts = Awaited<ReturnType<typeof getPosts>> // Promise?
type Post = Posts[number]

const PostCard = ( { post, dbUserId } : { post: Post; dbUserId: string | null } ) => {

    const { user } = useUser();
    const [ newComment, setNewComment ] = useState("")
    const [ isCommenting, setIsCommenting ] = useState(false)
    const [ isLiking, setIsLiking ] = useState(false)
    const [ hasLiked, setHasLiked ] = useState(post.likes.some(like => like.userId === dbUserId))
    const [ optimisticLikes, setOptimisticLikes ] = useState(post._count.likes)
    const [ isDeleting, setIsDeleting ] = useState(false)
    const [ showComments, setShowComments ] = useState(false)
    
    const handleLike = async () =>{
        if(isLiking) return

        try {
            setIsLiking(true)
            setHasLiked(prev => !prev) // this equals to setHasLiked(!hasLiked)
            setOptimisticLikes(prev => prev + (hasLiked ? -1 : 1))
            await toggleLike(post.id)
        } catch (error) {
            setOptimisticLikes(post._count.likes)
            setHasLiked(post.likes.some(like => like.userId === dbUserId))
        } finally {
          setIsLiking(false)
        }
    }


    const handleAddComment = async () =>{
      if (!newComment.trim() || isCommenting) return
      try {
        setIsCommenting(true)
        const result = await createComment(post.id, newComment);
        if (result?.success){
          toast.success("Comment posted Successfully")
          setNewComment("")
        }
      } catch (error) {
        toast.error("Failed to add comment")
      } finally {
        setIsCommenting(false)
      }
    }


    const handleDeletePost = async () =>{
      if(isDeleting) return
      try {
        setIsDeleting(true)
        const result = await deletePost(post.id)
        if(result.success) toast.success("Post's been deleted successfully")
          else throw new Error(result.error)
      } catch (error) {
        toast.error("Failed to delete post")
      } finally {
        setIsDeleting(false)
      }
    }


  return (
    <Card className='overflow-hidden'>
      <CardContent className='p-4 sm:pd-6'>
        <div className='space-y-4'>
          <div className='flex space-x-3 sm:space-x-4'>

            <Link href={`/profile/${post.author.username}`}>
              <Avatar className='size-8 sm:w-10 sm:h-10'>
                <AvatarImage src={post.author.image ?? "/avatar.png"} />
              </Avatar>
            </Link>

            {/* to not be Confused... */}
            {/* POST HEADER & TEXT CONTENT  */}
            <div className='flex-1 min-w-0'>
              <div className='flex items-start justify-between'>
                <div className='flex flex-col sm:flex-row sm:items-center sm:space-x-2 truncate'>
                  <Link href={`/profile/${post.author.username}`} className='font-semibold truncate' >
                    { post.author.name }
                  </Link>
                  <div className='flex items-center space-x-2 text-sm text-muted-foreground'>
                    <Link href={`/profile/${post.author.username}`}>
                      @{post.author.username}
                    </Link>
                    <span>•</span>
                    <span>{formatDistanceToNow(new Date(post.createdAt))} ago</span>
                  </div>
                </div>
                {dbUserId === post.author.id && (
                  <DeleteAlertDialog isDeleting={isDeleting} onDelete= {handleDeletePost}  />
                )}
              </div>
              <pre className='mt-2 text-sm text-foreground break-words text-wrap'>{post.content}</pre>
            </div>
          </div>

            {/* POST IMAGE */}
            { post.image && (
              <div className='rounded-lg overflow-hidden'>
                <img src="post.image" alt="Post content" className='w-full h-auto object-cover' />
              </div>
            ) }

            {/* LIKE && COMMENT BUTTONS */}
            <div className="flex items-center pt-2 space-x-4">
              { user ? (
                <Button
                 variant="ghost"
                 size= "sm"
                 className={`text-muted-foreground gap-2 ${
                  hasLiked ? "text-red-500 hover:text-red-700" : "hover:text-red-600"
                 }`}
                 onClick={handleLike}
                >
                  {hasLiked ? (
                    <HeartIcon className="size-5 fill-current" />
                  ) : (
                    <HeartIcon className="size-5" />
                  )}
                  <span>{ optimisticLikes }</span>
                </Button>
              ) : (
                <SignInButton mode='modal'>
                  <Button variant={"ghost"} size="sm" className='text-muted-foreground gap-2'>
                  <HeartIcon className="size-5" />
                  <span>{ optimisticLikes }</span> 
                  </Button>
                </SignInButton>
              )}

                <Button
                  variant="ghost"
                  size= "sm" 
                  className='text-muted-foreground gap-2 hover:text-blue-500'
                  onClick={ () => {setShowComments( (prev) => !prev )}}
                 >
                  <MessageCircleIcon 
                    className={`size-5 ${showComments ? "fill-blue-500 text-blue-500" : "" }`}
                  />
                  <span>{post.comments.length}</span>
                 </Button>

            </div>

            {/* COMMENT SECTION */}
          {showComments && (
            <div className='space-y-4 pt-4 border-t'>
              <div className='space-y-4'></div>
              {post.comments.map((comment) => (
                <div key={comment.id} className='flex space-x-3'>
                    <Avatar className='size-8 flex-shrink-0'>
                  <Link href={`/profile/${comment.author.username}`}>
                      <AvatarImage src={comment.author.image ?? "/avatar.png"} />
                  </Link>
                    </Avatar>

                  <div className=' min-w-0 p-2 bg-slate-100 dark:bg-neutral-800 rounded-md inline-block'>

                    <div className='flex-wrap items-center gap-x-2 gap-y-1 '>
                    <Link href={`/profile/${comment.author.username}`}>
                      <span className='text-sm font-bold truncate'>{ comment.author.name }</span>
                    </Link>
                      <span className='text-sm text-muted-foreground'>
                        @{ comment.author.username }
                      </span>
                    </div>

                    <pre className='text-sm break-words'>  { comment.content }</pre>
                      <span className='text-sm text-muted-foreground'>•</span>
                      <span className='text-xs text-muted-foreground'>
                        { formatDistanceToNow(new Date(comment.createdAt)) } ago
                      </span>
                  </div>
                </div>
              ))}
            </div>
          )}

            {user ? (
              <div className="flex space-x-3">
                <Avatar className='size-8 flex-shrink-0'>
                  <AvatarImage src={user?.imageUrl || "/avatar.png"} />
                </Avatar>
                <div className='flex-1'>
                  <Textarea
                   className='min-h-[80px] resize-none'
                   placeholder='Write a comment...' 
                   value={newComment}
                   onChange={(e) => setNewComment(e.target.value)}
                  />
                  <div className='flex justify-end mt-2'>
                    <Button
                     size={"sm"}
                     onClick={handleAddComment}
                     className='flex items-center gap-2'
                     disabled={!newComment.trim() || isCommenting}
                    >
                      {isCommenting ? (
                        "Posting..."
                      ) : (
                        <>
                          <SendIcon className='size-4' />
                          Comment
                        </>
                      )}
                      
                    </Button>
                  </div>
                  
                </div>
              </div>
            ) : (
              <div className='flex justify-center p-4 border rounded-lg bg-muted/50'>
                <SignInButton mode='modal'>
                  <Button variant={"outline"} className='gap-2'>
                    <LogInIcon className='size-4' />
                    Sign in to Comment
                  </Button>
                </SignInButton>
              </div>
            )}
          

        </div>
      </CardContent>
    </Card>
  )
}

export default PostCard
