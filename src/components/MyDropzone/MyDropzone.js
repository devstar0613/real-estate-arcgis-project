import React, { useState, useRef } from "react";
// import { AiOutlineCloudUpload } from "react-icons/ai";
// import pdfToText from 'react-pdftotext'
import { Toast } from 'primereact/toast';

const MyDropzone = ({selectedFiles, setSelectedFiles}) => {
  const InputChange = (event) => {
    let files = [...event.target.files];
    console.log('========event.target.files==========', event.target.files)
    if(files){
      for(let i=0; i< files.length; i++)
        if(!files[i].name.endsWith('.kml') && !files[i].name.endsWith('.kmz')){
          setSelectedFiles(null);
          return showError();
        }
      setSelectedFiles(files);
    }else {
      setSelectedFiles(null);
    }
    // if(!file.name.endsWith('pdf')) console.log('error');
  };
  const toast = useRef(null);
  const showError = () => {
    //@ts-ignore
    toast.current.show({
      severity:'error',
      summary: 'Error',
      detail:'The file upload failed because the invalid file format. Please upload files with .kml, .kmz extension.',
      life: 3000
    });
  }

  return (
    <div className="kb-data-box">
      <form>
        <div className="kb-file-upload">
          <div className="file-upload-box">
            <input
              type="file"
              id="fileupload"
              accept=".kml, .kmz"
              multiple
              className="file-upload-input"
              onChange={InputChange}
            />
            {/* <AiOutlineCloudUpload style={{width:'100%', height:'25px'}}/> */}
            <i className="pi pi-cloud-upload" style={{ fontSize: '2rem' }}></i>
            <p style={{fontSize:'16px', lineHeight:'23px'}}>
              <span className="file-link">Click to upload</span>
              &nbsp;or drop your files here
            </p>
            <div style={{fontSize:'13px'}}>
              <p style={{marginBottom:'3px'}}>Upload KML/KMZ Files</p>
            </div>
          </div>
        </div>
        {selectedFiles && 
          selectedFiles.map((file, index)=>(
            <div key={index} className="file-atc-box">
              <div className="file-detail">
                <p style={{fontSize:'15px'}}>{file?.name}</p>
                <p onClick={()=>setSelectedFiles(selectedFiles.filter((item) => item !== file))} className="deleteFile">×</p>
              </div>
              <div className="progress-bar">
                <div className="progress-bar-fill"></div>
              </div>
            </div>
          ))
        }
      </form>
      <Toast ref={toast} />
    </div>
  );
};

export default MyDropzone;