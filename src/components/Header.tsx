import { useEffect, useRef, useState } from 'react';
import { useAuth0 } from "@auth0/auth0-react";
import { Menu } from 'primereact/menu';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import * as api from '../api/index.js'

export default function Header() {
  const { user, logout } = useAuth0();
  const [visible, setVisible] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);
  const menuHeader = useRef<any>(null);
  let items = [
    {
      label: 'My Profile',
      icon: 'pi pi-cog',
      command: () => {
        setVisible(true);
      }
    },
    {
      label: 'Logout',
      icon: 'pi pi-sign-out',
      command: () => {
        handleLogout();
      }
    }
  ];
	
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const response = await api.getUserInfo(user?.email);
        setUserInfo(response.data);
      } catch (error) {
        console.error('Error fetching user info:', error);
      }
    };

    if (user?.email) {
      fetchUserInfo();
    }
  }, [user]);

	const handleLogout = () => {
    logout({
      logoutParams: {
        returnTo: 'https://www.atlaspro.ai',
      },
    });
  };

  const handleSubscription = async () => {
    try {
      const response= await api.getCheckoutUrl(user?.sub)
      if(response.data.url){
        window.location.href = response.data.url
      }

    } catch (error) {
      console.error('Error creating Stripe Checkout Session:', error);
    }
  };

	return (
		<header
			className="flex items-center justify-between map_sub_container bg-light-green"
			style={{ height: '10%' }}
		>
			<div className="flex items-center">
				<a href="/">
					<img
						// src="https://www.dropbox.com/scl/fi/ensej1l64crnkpsmy2kbi/atlaspro-light-logo-1.png?rlkey=t18h2pq0lez222klradjj8fy9&raw=1"
						src="/atlaspro_logo.png"
						alt="Atlas Pro Intelligence Logo"
						className="mx-auto" // Adjust the class as needed for styling
						width="100%"
						style={{ maxWidth: '130px' }}
					/>
				</a>
			</div>
      {/* <a href={`https://app.atlaspro.ai/${localStorage.getItem('Address')}`} style={{marginLeft:'10px',marginRight:'10px'}}>
        <img
          src="wand.png"
          alt="Magical Wand Image"
          className="mx-auto" // Adjust the class as needed for styling
          width="40px"
          // style={{ maxWidth: '150px' }}
        />
      </a> */}
      <div className="flex card justify-content-center" style={{boxShadow:'0 0 0 !important'}}>
        <Menu model={items} popup ref={menuHeader} id="popup_header_menu"style={{marginTop:'5px'}} />
        <img
          src="/avatar.png"
          alt="avatar"
          className="menu-button left_bar_icon"
          style={{width: '27px', height: '27px'}}
          onClick={(event) => {menuHeader.current.toggle(event)}} aria-controls="popup_header_menu" aria-haspopup
        />
      </div>
      <Dialog header="My Profile" visible={visible} style={{ width: '500px', background: '#00211D' }} onHide={() => {if (!visible) return; setVisible(false); }}>
        <div className="flex" style={{paddingBottom: '20px', gap: '25px'}}>
          <img
            src="/avatar.png"
            alt="avatar"
            style={{width: '150px', height: '150px'}}
          />
          <div className='profile-right'>
            <p>Name: <span>{'Test User'}</span></p>
            <p>Email: {user?.email}</p>
            <p>Plan:&nbsp;
              <span>
                {userInfo && userInfo.plan=== 'Pro' && 
                  `Pro (Expired at 08/05/2024)`
                }
                {userInfo && userInfo.plan=== 'Free Trial' && 
                  <>
                    Free Trial &nbsp;&nbsp;<span className='subscribe' onClick={handleSubscription}>Subscribe</span>
                  </>
                }
                {userInfo && userInfo.plan=== 'Paused' && 
                  <>
                    Trial ended &nbsp;&nbsp;<span className='subscribe' onClick={handleSubscription}>Subscribe</span>
                  </>
                }
              </span>
            </p>
          </div>
        </div>
        <div style={{float: 'right', marginTop: '5px'}}>
          <Button label="Close" onClick={()=> setVisible(false)} />
        </div>
      </Dialog>
		</header>
	)
}