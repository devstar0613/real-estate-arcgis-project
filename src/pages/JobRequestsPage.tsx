import { useEffect, useState, useRef } from 'react';
import Header from "../components/Header";
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import * as api from '../api/index.js'
import { Tag } from 'primereact/tag';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';

export default function JobRequestsPage() {
  const [data, setData] = useState<any>([]);
  const toast = useRef(null);
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const response = await api.allJobs();
        setData(response.data.jobRequests);
        console.log('=====response.data=====', response.data.jobRequests)
      } catch (error) {
        console.error('Error fetching all jobs:', error);
      }
    };

    fetchJobs();
  }, []);
  const handleResolve = async (rowData: any) => {
    try{
      console.log('======rowData========', rowData)
      const response= await api.resolveJob(rowData._id);
      if(response.data?.success){
        const new_data = data.map((item: any) => {
          if (item._id === rowData._id) {
            return { ...item, is_resolved: !rowData.is_resolved };
          }
          return item;
        });
        setData(new_data);
        console.log('======new_data========', new_data)
        //@ts-ignore
        toast.current.show({ severity: 'success', summary: 'Confirmed', detail: 'You have successfully proceeded.', life: 3000 });
      }
    }catch{
      //@ts-ignore
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'An error occurred processing your ruquest.', life: 3000 });
    }
  }
  const handleRemove = async (rowData: any) => {
    try{
      console.log('======rowData========', rowData)
      const response= await api.removeJob(rowData._id);
      if(response.data?.success){
        const new_data = data.filter((item: any) => item._id !== rowData._id);
        setData(new_data);
        console.log('======new_data========', new_data)
        //@ts-ignore
        toast.current.show({ severity: 'success', summary: 'Confirmed', detail: 'You have successfully removed the job request.', life: 3000 });
      }
    }catch{
      //@ts-ignore
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'An error occurred processing your ruquest.', life: 3000 });
    }
  }

  const accept = () => {
    //@ts-ignore
    toast.current.show({ severity: 'info', summary: 'Confirmed', detail: 'You have accepted', life: 3000 });
  }

  const reject = () => {
    //@ts-ignore
    toast.current.show({ severity: 'warn', summary: 'Rejected', detail: 'You have rejected', life: 3000 });
  }

  const confirm1 = (rowData: any) => {
    console.log('======rowData main========', rowData)
    confirmDialog({
      message: 'Are you sure you want to proceed?',
      header: 'Confirmation',
      icon: 'pi pi-exclamation-triangle',
      // defaultFocus: 'accept',
      accept: ()=>handleResolve(rowData),
      reject
    });
  };

  const confirm2 = (rowData: any) => {
    confirmDialog({
      message: 'Do you want to delete this record?',
      header: 'Delete Confirmation',
      icon: 'pi pi-info-circle',
      // defaultFocus: 'reject',
      acceptClassName: 'p-button-danger',
      accept: ()=> handleRemove(rowData),
      reject
    });
  };

	return (
    <section id="map-page-container" className="h-screen">
			<Header />
			<div style={{ height: '90%', paddingTop:'1%', paddingBottom:'1%' }} className="map_sub_container">
				<DataTable value={data? data: []} showGridlines scrollable stripedRows paginator rows={5} rowsPerPageOptions={[5, 10, 25, 50]} tableStyle={{ minWidth: '50rem', fontSize:'1rem' }}>
				{/* <DataTable value={data? data: []} paginator rows={5} rowsPerPageOptions={[10, 25, 50]} tableStyle={{ minWidth: '50rem', borderRadius: '10px' }}> */}
					<Column field="username" header="Username"></Column>
					<Column field="email" header="Email"></Column>
					<Column field="title" header="Job Title"></Column>
					<Column field="instruction" header="Job Instruction"></Column>
					<Column field="kml_urls" header="KML Urls" body={(rowData) => (rowData.kml_urls.join(',\n'))}></Column>
					<Column field="is_resolved" header="Status" body={(rowData) => (
            <div>
              <Tag value={rowData.is_resolved? 'Resolved': 'Unresolved'} severity={rowData.is_resolved? 'success': 'danger'}/>
              {/* {rowData.is_resolved? 'Resolved': 'Unresolved'} */}
            </div>
            )}></Column>
          <Column
            header="Actions"
            body={(rowData) => (
              <div style={{display: 'flex', gap: '5px'}}>
                {!rowData.is_resolved && 
                  <Button style={{padding: '0.3rem 0.6rem', width: '33px', height: '33px'}} size='small' icon="pi pi-check" severity='success' onClick={()=>confirm1(rowData)} />
                }
                {rowData.is_resolved &&
                  <Button style={{padding: '0.3rem 0.6rem', width: '33px', height: '33px'}} size='small' severity='secondary' icon="pi pi-undo" onClick={()=>confirm1(rowData)} />
                }
                <Button style={{padding: '0.3rem 0.6rem', width: '33px', height: '33px', marginRight: '10px'}} size='small' icon="pi pi-trash" severity="danger" onClick={()=>confirm2(rowData)} />
              </div>
            )}
          />
				</DataTable>
			</div>
      <Toast ref={toast} />
      <ConfirmDialog />
		</section>
	)
}