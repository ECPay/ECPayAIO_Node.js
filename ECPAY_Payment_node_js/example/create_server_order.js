/**
 * Created by ying.wu on 2017/6/27.
 */
const ecpay_payment = require('../lib/ecpay_payment.js')
//參數值為[PLEASE MODIFY]者，請在每次測試時給予獨特值
//若要測試非必帶參數請將base_param內註解的參數依需求取消註解 //
let base_param = {
  MerchantTradeNo: 'PLEASE MODIFY', // 唯一值，不可重覆
  MerchantTradeDate: 'PLEASE MODIFY',  // 交易時間格式為「yyyy/MM/dd HH:mm:ss」, ex: 2017/02/12 10:20:20
  TotalAmount: '100',
  CurrencyCode: 'TWD',
  ItemName: '手機2萬元',
  PlatformID: '',
  TradeDesc: 'Test TradeDesc',
  TradeType: '2', // 1: In APP 2: On the Web
  PaymentToken: '' // 請將Apple Server做商店驗證完回傳的Merchant Session物件中的Payment物件的JSON，轉成字串放入
}
const options = require('../conf/config-example'),
  query = new ecpay_payment(options),
  res = query.query_client.create_server_order(parameters = base_param)
res.then(function (result) {
  console.log(result)
}).catch(function (err) {
  console.log(err)
})