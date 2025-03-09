import Image from 'next/image'
import React from 'react'

const loading = () => {
  return (
    <div className='w-full h-screen flex justify-center items-center '>
      <h1 className='my-10 mx-auto text-center' > Loading... </h1>
      <Image src={`/loadingProfile.gif`} alt='' width={250} height={250} className='rounded-full absolute '  />
    </div>
  )
}

export default loading
