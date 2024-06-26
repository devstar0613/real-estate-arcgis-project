import { useEffect, useRef, useState } from 'react';
import { useAuth0 } from "@auth0/auth0-react";

export default function Header() {
  const [avatarFlag, setAvatarFlag] = useState<any>(0);
  const { logout } = useAuth0();

	const handleAvatarClick = () => {
    setAvatarFlag((prevFlag: number) => (prevFlag === 0 ? 1 : 0));
  };
	
	const handleLogout = () => {
    logout({
      logoutParams: {
        returnTo: 'https://www.atlaspro.ai',
      },
    });
  };

	useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      const dropdown = document.querySelector('.avatar_dropdown');
      const avatar = document.querySelector('.avatar_image');

      if (avatar && dropdown && !avatar.contains(event.target as Node) && !dropdown.contains(event.target as Node)) {
        setAvatarFlag(0);
      }
    };

    document.addEventListener('click', handleDocumentClick);

    return () => {
      document.removeEventListener('click', handleDocumentClick);
    };
  }, []);

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
			<div className="flex items-center">
				{/* <a href={`https://app.atlaspro.ai/${localStorage.getItem('Address')}`} style={{marginLeft:'10px',marginRight:'10px'}}>
					<img
						src="wand.png"
						alt="Magical Wand Image"
						className="mx-auto" // Adjust the class as needed for styling
						width="40px"
						// style={{ maxWidth: '150px' }}
					/>
				</a> */}
				<div style={{cursor:'pointer'}}>
					<img
						// src="https://www.dropbox.com/scl/fi/0tssi4mzfom6e3y7p0n0f/Pngtree-user-icon_4479727.png?rlkey=b7q7n33exi2m4b7jkmdh4bf6m&raw=1"
						src="/settings.png"
						alt="Atlas Pro Intelligence Logo"
						className="mx-auto avatar_image" // Adjust the class as needed for styling
						width="30px"
						onClick={handleAvatarClick}
					/>
					{avatarFlag === 1 &&
						<div className="avatar_dropdown">
							<p className="logout_button" style={{marginLeft:'20px', marginTop:'5px'}} onClick={handleLogout}>Log out</p> 
						</div>}
				</div>
			</div>
		</header>
	)
}