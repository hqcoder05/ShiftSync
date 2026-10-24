export const CATALOG = [
  { id:'barista', name:'Cụm pha chế', category:'Trạm', node:'Workstation_Barista_01', role:'BARISTA' },
  { id:'cashier', name:'Cụm thu ngân', category:'Trạm', node:'Workstation_POS_01', role:'POS' },
  { id:'service', name:'Quầy trả món', category:'Trạm', node:'Workstation_Service_01', role:'SERVICE' },
  { id:'kitchen', name:'Cụm bếp', category:'Trạm', node:'Workstation_Kitchen_01', role:'KITCHEN' },
  { id:'bistro', name:'Bộ bàn cà phê', category:'Nội thất', node:'Bistro_Table_Group_0' },
  { id:'booth', name:'Bộ ghế băng', category:'Nội thất', node:'Booth_Section_0' },
  { id:'communal', name:'Bàn làm việc chung', category:'Nội thất', node:'Communal_Work_Table_Group' },
  { id:'lounge', name:'Góc sofa', category:'Nội thất', node:'Lounge_Seating_Nook' },
  { id:'table', name:'Bàn đơn', category:'Nội thất' },
  { id:'chair', name:'Ghế đơn', category:'Nội thất' },
  { id:'plant', name:'Chậu cây', category:'Trang trí' },
  { id:'shelf', name:'Kệ lưu trữ', category:'Nội thất' },
  { id:'lamp', name:'Đèn đứng', category:'Trang trí' },
  { id:'wall', name:'Vách / tường', category:'Kiến trúc', dimensions:[3,2.7,.16] },
  { id:'door', name:'Khung cửa', category:'Kiến trúc', dimensions:[1.2,2.5,.16] },
];
export const assetById = id => CATALOG.find(asset => asset.id === id);
