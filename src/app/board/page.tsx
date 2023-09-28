import Link from 'next/link';
import React from 'react';

const title = 'Dynamic Data';

export const metadata = {
    title,
    openGraph: {
        title
    },
};

export default function Page() {
    const ids = [{ id: '1' }, { id: '2' }, { id: '3' }];
    return (<div className='h-full'> 
        {
            ids.map(item => (
                <div key={item.id} >
                    <Link href={`/new/${item.id}`}>Click - {item.id}</Link>
                </div>
            ))
        }
    </div>)
}