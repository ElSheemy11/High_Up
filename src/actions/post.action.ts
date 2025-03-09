"use server";

import { prisma } from "@/lib/prisma";
import { getDbUserId } from "./user.action";
import { revalidatePath } from "next/cache";

export async function createPost(content:string, image:string){
    try {
        const userId = await getDbUserId();

        if(!userId) return;

        const post = await prisma.post.create({
            data:{
                content,
                image,
                authorId: userId // we authorId not author as it's used in post schema
            }
        })
        revalidatePath("/") // purging the cache for the home page
        return {success:true, post}
    } catch (error) {
        return { success:false, error: "Failed to create post" }
    }
}

export async function getPosts() {
    try {
        const posts = await prisma.post.findMany({
            orderBy: {
                createdAt: "desc"
            },
            include: {
                author: {
                    select: {
                        id: true,
                        name: true,
                        image: true,
                        username: true,
                    }
                },
                comments: {
                    include: {
                        author: {
                            select: {
                                id: true,
                                image: true,
                                name: true,
                                username: true,
                            }
                        }
                    },
                    orderBy: {
                        createdAt: "asc"
                    }
                },
                likes: {
                    select: {
                        userId: true
                    }
                },
                _count: {
                    select: {
                        likes: true,
                        comments: true,
                    }
                }
            }
        })

        return posts;
    } catch (error) {
        console.log("Error in getPosts", error);
        throw new Error("Failed to fetch posts")
    }
}

export async function toggleLike(postId : string){
    try {
        const userId = await getDbUserId()
        if(!userId) return

        // why not check if like already exists ? we have to!
        const existingLike = await prisma.like.findUnique({
            where: {
                userId_postId: {
                    userId,
                    postId,
                }
            }
        });

        const post = await prisma.post.findUnique({
            where: {
                id: postId
            },
            select: {
                authorId: true
            }
        })

        if(!post) throw new Error("Post not found")

        if(existingLike) {
            //unlike
            await prisma.like.delete({
                where: {
                    userId_postId: {
                        userId,
                        postId,
                    }
                }
            })
        } else {
            // like and create notification (only if liking someone else's post)
            await prisma.$transaction([
                prisma.like.create({
                    data: {
                        userId,
                        postId,
                    },
                }),
                ...(post.authorId !== userId ? [ 
                        prisma.notification.create({
                            data: {
                                type: "LIKE",
                                userId: post.authorId,
                                creatorId: userId,
                                postId,
                            }
                        })
                    ] : [] )
            ])
        }
        revalidatePath("/")
        return { success: true };
    } catch (error) {
        console.error("Failed to toggle like:", error)
        return { success: false, error: "Failed to toggle like" }

        }
}

export async function createComment(postId:string, content:string){
    try {
        const userId = await getDbUserId();
        if(!userId) return
        if(!content) throw new Error("Content is required!")
        
        const post = await prisma.post.findUnique({
            where: { id: postId },
            select: { authorId: true }
        });

        if(!post) throw new Error("Post not found");

        // create comment and a notification in transaction (both or none!)
        const [comment] = await prisma.$transaction( async (tx)=>{
            // First I have to create a comment..
            const newComment = await tx.comment.create({
                data: {
                    content,
                    authorId: userId,
                    postId,
                },
            });

            // second is creating a notification if commented on someone else's post
            if(post.authorId !== userId) {
                await tx.notification.create({
                    data:{
                        type: "COMMENT",
                        userId: post.authorId,
                        creatorId: userId,
                        postId,
                        commentId: newComment.id,
                    },
                });
            };
            return [newComment]
        });

        revalidatePath("/");
        return { success: true, comment };

    } catch (error) {
        console.error("Failed to create comment: ", error)
        return { success: false, error:"Failed to create comment" }
    }
}

export async function deletePost(postId:string) {
    try {
        const userId = await getDbUserId();

        const post = await prisma.post.findUnique({
            where: { id: postId },
            select: { authorId: true },
        });

        if(!post) throw new Error("Post not found");
        if(post.authorId !== userId) throw new Error("Unauthorized - No delete permission");

        await prisma.post.delete({
            where: { id: postId },
        });

        revalidatePath("/") // I really have to purge the cache indeed..
        return { success: true };

    } catch (error) {
        console.error("Failed to delete post: ", error)
        return { success: false, error: "Failed to delete post" }
    }
}