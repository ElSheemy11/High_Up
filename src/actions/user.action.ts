"use server";

import { prisma } from "@/lib/prisma";
import { auth, currentUser } from "@clerk/nextjs/server";
import { error } from "console";
import { revalidatePath } from "next/cache";

// As the function name refers to..
export async function syncUser() {
    try {
        const {userId} = await auth()
        const user = await currentUser()

        if(!user || !userId) return;

        //I think I should check if user already exists right?
        const existingUser =await prisma.user.findUnique({
            where:{
                clerkId: userId
            }
        })

        if(existingUser) return existingUser


        const dbUser = await prisma.user.create({
            data: {
                clerkId: userId,
                name:`${user.firstName || ""} ${user.lastName || ""}`, //if it's value is null then put an empty value
                username: user.username ?? user.emailAddresses[0].emailAddress.split("@")[0],
                email: user.emailAddresses[0].emailAddress,
                image: user.imageUrl,

            }
        })

        return dbUser
    } catch (error) {
        console.log("Error in syncUser :", error)
    }
}

// we have to Get data from db to present it on the sidebar
export async function getUserByClerkId(clerkId:string) {
    return prisma.user.findUnique({
        where:{
            clerkId,
        },
        include:{
            _count:{
                select:{
                    followers: true,
                    following: true,
                    posts:true,
                }
            }
        }
    })
}

// Ensuring user is authorized and ready to use the app
export async function getDbUserId(){
    const { userId: clerkId } = await auth() // ":" is a way to rename an object while destructuring
    if(!clerkId) return null;

    const user = await getUserByClerkId(clerkId);

    if(!user) throw new Error("User not found!");

    return user.id
}

// For Suggested users,  dah -_-
export async function getRandomUsers() {
    try {
        const userId = await getDbUserId()

        if(!userId) return []

        // get 3 random users exclude ourselves & users that we already follow
        const randomUsers = await prisma.user.findMany({
            where: {
                AND:[
                    {NOT:{id:userId},},
                    {NOT:{
                        followers:{
                            some:{
                                followerId: userId
                            }
                        }
                    }},
                ]
            },
            select:{
                id: true,
                name: true,
                username: true,
                image: true,
                _count:{
                    select:{
                        followers: true,
                    }
                }
            },
            take: 3,
        })

        return randomUsers
    } catch (error) {
        console.log("Error fetching random users:", error)
        return []
    }
}
// Follow   
export async function toggleFollow(targetUserId:string){
    try {
        const userId = await getDbUserId();

        if(!userId) return

        if (userId === targetUserId) throw new Error("You cannot follow yourself")
        
        const existingFollow = await prisma.follows.findUnique({
            where:{
                followerId_followingId: {
                    followerId: userId,
                    followingId: targetUserId,
                }
            }
        })

        if(existingFollow){
            //unfollow
            await prisma.follows.delete({
                where:{
                    followerId_followingId: {
                        followerId: userId,
                        followingId: targetUserId,
                    }
                }
            }) 
        } else {
            //follow
            await prisma.$transaction([ //transaction means either all or none
                prisma.follows.create({
                    data:{
                        followerId: userId,
                        followingId: targetUserId
                    }
                }),

                prisma.notification.create({
                    data:{
                        type:"FOLLOW",
                        userId: targetUserId, //user being followed (being notified)
                        creatorId: userId // user follows (creating notification)
                    }
                })
            ])
        }
        revalidatePath("/")
        return{ success: true }
    } catch (error) {
        console.log("Error in toggleFollow: ", error)
        return {success: false, error: "Error toggling follow"}
    }
}