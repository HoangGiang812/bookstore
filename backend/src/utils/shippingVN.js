// backend/src/utils/shippingVN.js
// Phí ship theo khu vực Việt Nam (đơn vị: VND) + freeship nếu đủ ngưỡng.
const REGIONS = {
  HN_HCM_INNER: {
    provinces: ['Hà Nội', 'TP. Hồ Chí Minh', 'Hồ Chí Minh', 'Ho Chi Minh', 'Ha Noi'],
    fee: 20000,
  },
  NEARBY: {
    provinces: [
      'Bắc Ninh','Bắc Giang','Hưng Yên','Hải Dương','Hải Phòng','Vĩnh Phúc','Thái Nguyên',
      'Long An','Bình Dương','Đồng Nai'
    ],
    fee: 30000,
  },
  NORTH: {
    provinces: [
      'Hà Giang','Cao Bằng','Lào Cai','Yên Bái','Tuyên Quang','Lai Châu','Sơn La','Điện Biên',
      'Lạng Sơn','Quảng Ninh','Phú Thọ','Bắc Kạn','Ninh Bình','Nam Định','Thái Bình','Hà Nam',
      'Thanh Hóa','Nghệ An','Hà Tĩnh'
    ],
    fee: 35000,
  },
  CENTRAL: {
    provinces: [
      'Quảng Bình','Quảng Trị','Thừa Thiên Huế','Đà Nẵng','Quảng Nam','Quảng Ngãi','Bình Định',
      'Phú Yên','Khánh Hòa','Ninh Thuận','Bình Thuận','Kon Tum','Gia Lai','Đắk Lắk','Đắk Nông','Lâm Đồng'
    ],
    fee: 35000,
  },
  SOUTH: {
    provinces: [
      'Bà Rịa - Vũng Tàu','Tây Ninh','Bình Phước','Tiền Giang','Bến Tre','Vĩnh Long','Trà Vinh',
      'Cần Thơ','Hậu Giang','Sóc Trăng','An Giang','Đồng Tháp','Kiên Giang','Bạc Liêu','Cà Mau'
    ],
    fee: 35000,
  },
  ISLANDS_REMOTE: {
    provinces: ['Hoàng Sa','Trường Sa','Côn Đảo','Phú Quốc','Lý Sơn'],
    fee: 50000,
  },
};

function normalize(str) {
  return String(str || '').normalize('NFC').trim().toLowerCase();
}

/**
 * Tính phí ship theo địa chỉ VN.
 * @param {Object} address { province, district, ... }
 * @param {Object} opt { subtotal, freeShipThreshold }
 */
export function calcShippingFeeByVNAddress(
  address = {},
  { subtotal = 0, freeShipThreshold = 300000 } = {}
) {
  if (Number(subtotal) >= Number(freeShipThreshold)) return 0;

  const province = normalize(address.province || address.city || address.region || '');

  for (const { provinces, fee } of Object.values(REGIONS)) {
    if (provinces.some((p) => normalize(p) === province)) {
      return fee;
    }
  }
  // fallback nếu không match
  return 40000;
}
