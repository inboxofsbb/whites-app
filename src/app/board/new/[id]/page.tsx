export default function Page({ params }: { params: { id: string } }) {
    return (
        <div>
                    Page Id : {params.id}
        </div>
    )
}