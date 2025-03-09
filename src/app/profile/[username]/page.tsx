import { getProfileByUsername, getUserLikedPosts, getUserPosts, isFollowing } from '@/actions/profile.action';
import { notFound } from 'next/navigation';
import React from 'react'
import ProfilePageClient from './ProfilePageClient';

export async function generateMetaData( {params}: {params: { username: string }} ){
    const user = await getProfileByUsername(params.username)
    if(!user) return;

    return {
        title: `${ user.name ?? user.username }`,
        description : user.bio || `Check out ${user.username}'s profile.`
    }
}



const ProfilePageServer = async({ params } : { params: { username: string } } ) => {
    await new Promise ( (resolve) => setTimeout(resolve, 3000) ); 

    const user = await getProfileByUsername(params.username)
    
    if(!user) notFound();

    const [posts, likedPosts, isCurrentUserFollowing] = await Promise.all([
        getUserPosts(user.id),
        getUserLikedPosts(user.id),
        isFollowing(user.id),
    ])

  return <ProfilePageClient
    user = {user}
    posts = {posts}
    likedPosts = {likedPosts}
    isFollowing = {isCurrentUserFollowing}
  />
}

export default ProfilePageServer
