import {Navigate,useLocation} from 'react-router-dom';
import {legacyRequestRoute} from '../utils/notificationNavigation.js';

export default function LegacyRequestRedirect(){
  const {pathname,search}=useLocation();
  return <Navigate to={legacyRequestRoute(pathname,search)} replace/>;
}
