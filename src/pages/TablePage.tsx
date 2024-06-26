import Header from "../components/Header";
import useIndexDB from '../hooks/useIndexDB';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';

export default function TablePage() {
  const [data] = useIndexDB<any[]>('parcels', []);

	return (
    <section id="map-page-container" className="h-screen">
			<Header />
			{/* <div style={{height: '800px'}}>
				<table className='table-page'>
					<thead>
						<tr>
							<th>Parcel ID</th>
							<th>Address</th>
							<th>Owner</th>
							<th>Email</th>
							<th>Phone Number</th>
							<th>Land Use Code</th>
							<th>Land Use Description</th>
						</tr>
					</thead>
					<tr>
						<td colSpan={7}>
							<hr style={{marginTop: '12px', marginBottom: '12px'}}/>
						</td>
					</tr>
					<tbody>
						{data && data.length> 0 ?
							data.map((parcel:any, index:any)=> (
							<tr key={index}>
								<td className="table-page-text">{parcel['Parcel Number']}</td>
								<td className="table-page-text">{parcel['Parcel Address']}</td>
								<td className="table-page-text">{parcel['Owner Name']}</td>
								<td className="table-page-text">{parcel['Owner Email']}</td>
								<td className="table-page-text">{parcel['Owner Phone']}</td>
								<td className="table-page-text">{parcel['Land Use Code: Activity']}</td>
								<td className="table-page-text">{parcel['Land Use Code Description: Activity']}</td>
							</tr>
						)): <tr><td colSpan={7}>No data</td></tr>}
					</tbody>
				</table>
			</div> */}
			<div style={{ height: '90%', paddingTop:'1%', paddingBottom:'1%' }} className="map_sub_container">
				<DataTable value={data? data: []} paginator rows={10} rowsPerPageOptions={[5, 10, 25, 50, 100]} scrollable stripedRows tableStyle={{ minWidth: '50rem', fontSize:'1rem' }}>
				{/* <DataTable value={data? data: []} paginator rows={5} rowsPerPageOptions={[10, 25, 50]} tableStyle={{ minWidth: '50rem', borderRadius: '10px' }}> */}
					<Column field="Parcel Number" header="Parcel ID"></Column>
					<Column field="Parcel Address" header="Address"></Column>
					<Column field="Owner Name" header="Owner"></Column>
					<Column field="Owner Email" header="Email"></Column>
					<Column field="Owner Phone" header="Phone Number"></Column>
					<Column field="Land Use Code: Activity" header="Land Use Code"></Column>
					<Column field="Land Use Code Description: Activity" header="Land Use Description"></Column>
				</DataTable>
			</div>
		</section>
	)
}