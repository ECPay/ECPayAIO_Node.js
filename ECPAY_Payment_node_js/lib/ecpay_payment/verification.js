/**
 * Created by ying.wu on 2017/6/12.
 */
const ECpayError = require('./error.js');
const fs = require('fs');
const et = require('elementtree');

class PaymentVerifyBase{
    constructor(){
        this.param_xml_file = fs.readFileSync(__dirname + '/../../lib/ecpay_payment/ECpayPayment.xml').toString();
        this.param_xml = et.parse(this.param_xml_file);
    }

    get_svc_url(apiname, mode){
        let url = this.param_xml.findtext(`./${apiname}/ServiceAddress/url[@type=\"${mode}\"]`);
        return url;
    }

    get_special_encode_param(apiname){
        let ret = [];
        let node = this.param_xml.findall(`./${apiname}/Parameters//param[@urlencode=\"1\"]`);
        // console.log(node);
        node.forEach(function (elem) {
            // console.log(elem.attrib.name);
            ret.push(elem.attrib.name);
        });
        return ret;
    }

    get_basic_params(apiname){
        let basic_param = [];
        this.param_xml.findall(`./${apiname}/Parameters/param[@require=\"1\"]`).forEach(function (elem) {
           // console.log(elem.attrib.name);
           basic_param.push(elem.attrib.name);
        });
        return basic_param;
    }

    get_cond_param(apiname){
        let aio_sw_param = [];
        let conditional_param = {};
        this.param_xml.findall(`./${apiname}/Config/switchparam/n`).forEach(function (elem) {
           // console.log(elem.text);
           aio_sw_param.push(elem.text);
        });
        let param_xml = this.param_xml;
        aio_sw_param.forEach(function (pname) {
            let opt_param = {};
            let node = param_xml.findall(`./${apiname}/Parameters//param[@name=\"${pname}\"]/condparam`);
            node.forEach(function (elem) {
               let opt = elem.attrib.owner;
               let params = [];
               param_xml.findall(`./${apiname}/Parameters//param[@name=\"${pname}\"]//condparam[@owner=\"${opt}\"]/param[@require="1"]`).forEach(function (pa) {
                  params.push(pa.attrib.name);
               });
               opt_param[opt] = params;
            });
            conditional_param[pname] = opt_param;
        });
        return conditional_param;
    }

    get_param_type(apiname){
        let param_type ={};
        this.param_xml.findall(`./${apiname}/Parameters//param`).forEach(function (elem) {
           param_type[elem.attrib.name] = elem.attrib.type;
        });
        return param_type;
    }

    get_opt_param_pattern(apiname){
        let pattern = {};
        let temp_arr = [];
        let param_xml = this.param_xml;
        let node = this.param_xml.findall(`./${apiname}/Parameters//param[@type=\"Opt\"]`);
        node.forEach(function (param_elem) {
            temp_arr.push(param_elem.attrib.name);
        });
        // console.log(temp_arr);
        temp_arr.forEach(function (opt_params) {
            // console.log(opt_params);
            let opt_elems = param_xml.findall(`./${apiname}/Parameters//param[@name=\"${opt_params}\"]//option`);
            // console.log(opt_elems);
            let opt = [];
            opt_elems.forEach(function (oe) {opt.push(oe.text);});
            // console.log(opt);
            pattern[opt_params] = opt;
        });
        if (apiname === 'AioCheckOut'){
            pattern['ChoosePayment'].splice(3, 13);
        }
        // console.log(pattern);
        return pattern;
    }

    get_int_param_pattern(apiname){
        let pattern = {};
        let temp_arr = [];
        let param_xml = this.param_xml;
        let node = this.param_xml.findall(`./${apiname}/Parameters//param[@type=\"Int\"]`);
        node.forEach(function (param_elem) {
            temp_arr.push(param_elem.attrib.name);
        });
        // console.log(temp_arr);
        temp_arr.forEach(function (opt_params) {
            // console.log(opt_params);
            let mode = param_xml.findall(`./${apiname}/Parameters//param[@name=\"${opt_params}\"]//mode`);
            let mx = param_xml.findall(`./${apiname}/Parameters//param[@name=\"${opt_params}\"]//maximum`);
            let mn = param_xml.findall(`./${apiname}/Parameters//param[@name=\"${opt_params}\"]//minimal`);
            // console.log(mode);
            let arr = [];
            mode.forEach(function (md) {arr.push(md.text);});
            mx.forEach(function (mx) {arr.push(mx.text);});
            mn.forEach(function (mn) {arr.push(mn.text);});
            // console.log(arr);
            pattern[opt_params] = arr;
        });
        if (apiname === 'AioCheckOut'){
            pattern['StoreExpireDate'].splice(1, 2);
            pattern['StoreExpireDate'].splice(2, 1);
        }
        // console.log(pattern);
        return pattern;
    }

    get_str_param_pattern(apiname){
        let pattern = {};
        let temp_arr = [];
        let param_xml = this.param_xml;
        let node = this.param_xml.findall(`./${apiname}/Parameters//param[@type=\"String\"]`);
        node.forEach(function (param_elem) {
            temp_arr.push(param_elem.attrib.name);
        });
        // console.log(temp_arr);
        temp_arr.forEach(function (opt_params) {
            // console.log(opt_params);
            let pat_elems = param_xml.findall(`./${apiname}/Parameters//param[@name=\"${opt_params}\"]//pattern`);
            let arr = [];
            pat_elems.forEach(function (pa) {arr.push(pa.text);});
            // console.log(arr);
            pattern[opt_params] = arr.toString();
        });
        if (apiname === 'AioCheckOut'){
            pattern['InvoiceMark'] = '';
            pattern['PaymentInfoURL'] = pattern['PaymentInfoURL'].slice(11,21);
            pattern['ClientRedirectURL'] = pattern['ClientRedirectURL'].slice(11,21);
            pattern['Desc_1'] = pattern['Desc_1'].slice(10,20);
            pattern['Desc_2'] = pattern['Desc_2'].slice(10,20);
            pattern['Desc_3'] = pattern['Desc_3'].slice(10,20);
            pattern['Desc_4'] = pattern['Desc_4'].slice(10,20);
        }
        // console.log(pattern);
        return pattern;
    }

    get_depopt_param_pattern(apiname){
        let pattern = {};
        let param_xml = this.param_xml;
        let p_name, parent_name;
        let k, get_opts;
        let k_opts = [];
        let sub_opts = {};
        let parent_n_opts = {};
        let node = this.param_xml.findall(`./${apiname}/Parameters//param[@type=\"DepOpt\"]`);
        node.forEach(function (param_elem) {
            p_name = param_elem.attrib.name;
            parent_name = param_elem.attrib.main;
        });
        k = this.param_xml.findall(`./${apiname}/Parameters//param[@name=\"${p_name}\"]//mainoption`);
        k.forEach(function (elem) {
           k_opts.push(elem.attrib.name);
        });
        k_opts.forEach(function (elem) {
            get_opts = param_xml.findall(`./${apiname}/Parameters//mainoption[@name=\"${elem}\"]//option`);
            let opt = [];
            get_opts.forEach(function (c) {
                opt.push(c.text);
                sub_opts[elem] = opt;
            });
        });
        // console.log(sub_opts);
        parent_n_opts[parent_name] = sub_opts;
        // console.log(parent_n_opts);
        pattern[p_name] = parent_n_opts;
        // console.log(pattern['ChooseSubPayment']['ChoosePayment']['BARCODE']);
        return pattern;
    }

    get_all_pattern(apiname){
        let res = {};
        res['Type_idx'] = this.get_param_type(apiname);
        res['Int'] = this.get_int_param_pattern(apiname);
        res['String'] = this.get_str_param_pattern(apiname);
        res['Opt'] = this.get_opt_param_pattern(apiname);
        res['DepOpt'] = this.get_depopt_param_pattern(apiname);
        return res;
    }

    verify_param_by_pattern(params, pattern){
        // console.log(params);
        // console.log(pattern);
        let type_index = pattern['Type_idx'];
        // console.log(type_index);
        Object.keys(params).forEach(function (p_name) {
           // console.log(p_name);
           let p_type = type_index[p_name];
           // console.log(p_type);
           let patt_container = pattern[p_type];
           // console.log(patt_container);
           switch (p_type) {
               case 'String':
                   let regex_patt = patt_container[p_name];
                   let mat = params[p_name].match(new RegExp(regex_patt));
                   if (mat === null){
                       throw new ECpayError.ECpayInvalidParam(`Wrong format of param ${p_name} or length exceeded.`);
                   }
                   break;
               case 'Opt':
                   let aval_opt = patt_container[p_name];
                   let mat_opt = aval_opt.includes(params[p_name]);
                   if (mat_opt === false){
                       throw new ECpayError.ECpayInvalidParam(`Unexpected option of param ${p_name} (${params[p_name]}). Available option: (${aval_opt}).`);
                   }
                   break;
               case 'Int':
                   let criteria = patt_container[p_name];
                   // console.log('criteria: '+ criteria);
                   let mode = criteria[0];
                   let max = parseInt(criteria[1]);
                   let min = parseInt(criteria[2]);
                   let val = parseInt(params[p_name]);
                   // console.log('mode: '+ mode);
                   // console.log('max: '+  max);
                   // console.log('min: '+  min);
                   // console.log('val: '+  val);
                   switch (mode){
                       case 'BETWEEN':
                           if (val < min || val > max){
                               throw new ECpayError.ECpayInvalidParam(`Value of ${p_name} should be between ${min} and ${max}.`);
                           }
                           break;
                       case 'GE':
                           if (val < min){
                               throw new ECpayError.ECpayInvalidParam(`Value of ${p_name} should be greater than or equal to ${min}.`);
                           }
                           break;
                       case 'LE':
                           if (val > max){
                               throw new ECpayError.ECpayInvalidParam(`Value of ${p_name} should be less than or equal to ${max}.`);
                           }
                           break;
                       case 'EXCLUDE':
                           if (val >= max && val <= max){
                               throw new ECpayError.ECpayInvalidParam(`Value of ${p_name} can NOT be between ${min} and ${max}..`);
                           }
                           break;
                       default:
                           throw new ECpayError.ECpayInvalidParam(`Unexpected integer verification mode for parameter ${p_name}: ${mode}.`);
                   }
                   break;
               case 'DepOpt':
                   let dep_opt = patt_container[p_name];
                   let parent_param = Object.keys(dep_opt)[0];
                   let all_dep_opt = dep_opt[parent_param];
                   let parent_val = params[parent_param];
                   let aval_dopt = all_dep_opt[parent_val];
                   if (aval_dopt === null && pattern['Opt'][parent_param].includes(parent_val) === false){
                       throw new ECpayError.ECpayInvalidParam(`Cannot find available option of [${p_name}] by related param [${parent_param}](Value: ${parent_val}.`);
                   } else if (aval_dopt.constructor === Array){
                       if (!aval_dopt.includes(params[p_name])){
                           throw new ECpayError.ECpayInvalidParam(`Unexpected option of param ${p_name} (${params[p_name]}). Available option: (${aval_dopt}).`);
                       }
                   }
                   break;
               default:
                   throw new Error(`Unexpected type (${p_type}) for parameter ${p_name}.`);
           }
        });
    }
}

class AioCheckOutParamVerify extends PaymentVerifyBase{
    constructor(){
        super();
        this.aio_basic_param = this.get_basic_params('AioCheckOut');
        this.aio_conditional_param = this.get_cond_param('AioCheckOut');
        this.all_param_pattern = this.get_all_pattern('AioCheckOut');
    }

    get_serialized_data(){
        console.log(this.aio_basic_param);
        console.log('-----');
        console.log(this.aio_conditional_param);
        let new_di = this.aio_conditional_param;
        delete new_di['InvoiceMark'];
        console.log(this.aio_conditional_param);
        console.log('-----');
        console.log(new_di);
    }

    verify_aio_payment_param(params){
        if (params.constructor === Object){
            // Force specify => DeviceSource, IgnorePayment, PlatformID, EncryptType
            let fix_params = {
                DeviceSource: '',
                // PlatformID: '',
                EncryptType: '1',
                PaymentType: 'aio'
            };
            Object.assign(params, fix_params);
            // Verify Basic param requirement
            // if (params === {}){
            //     throw new ECpayError.ECpayInvalidParam(`Parameter object is empty.`);
            // }

            let basic_param = this.aio_basic_param.sort();
            let input_param = Object.keys(params).sort();
            basic_param.forEach(function (pname) {
               if (input_param.indexOf(pname, 0) === -1){
                   throw new ECpayError.ECpayInvalidParam(`Lack required param ${pname}`);
               }
            });

            // Verify Extend param requirement
            let ext_param = this.aio_conditional_param;
            delete ext_param['InvoiceMark'];
            Object.keys(ext_param).forEach(function (pa) {
               let val = params[pa];
               let related_required_param = ext_param[pa][val];
               if (related_required_param !== undefined && related_required_param !== []){
                   related_required_param.forEach(function (e) {
                       if (!Object.keys(params).includes(e)){
                           throw new ECpayError.ECpayInvalidParam(`Lack required parameter [${e}] when [${pa}] is set to [${val}].`);
                       }
                   });
               }
            });

            // Verify Value pattern of each param
            this.verify_param_by_pattern(params, this.all_param_pattern);
        } else {
            throw new TypeError(`Received argument is not a Object.`);
        }
    }

    verify_aio_inv_param(params){
        if (params.constructor === Object){
            // 發票所有參數預設要全帶
            Object.keys(params).forEach(function (keys) {
               if (params[keys] === null){
                   throw new ECpayError.ECpayInvalidParam(`Parameter value cannot be null.`);
               }
            });
            // 1. 比對欄位是否缺乏
            let inv_param = this.aio_conditional_param['InvoiceMark']['Y'];
            let input_param = Object.keys(params);
            inv_param.forEach(function (pname) {
                if (input_param.indexOf(pname, 0) === -1){
                    throw new ECpayError.ECpayInvalidParam(`Lack required invoice param ${pname}`);
                }
            });
            input_param.forEach(function (pname) {
                if (inv_param.indexOf(pname, 0) === -1){
                    throw new ECpayError.ECpayInvalidParam(`Unexpected parameter in Invoice parameters ${pname}`);
                }
            });

            // let inv_param_names = this.aio_conditional_param['InvoiceMark']['Y'];
            // let param_diff = inv_param_names - Object.keys(params);
            // if (param_diff !== []){
            //     throw new ECpayError.ECpayInvalidParam(`Lack required invoice param ${param_diff}`);
            // }
            // let unexp_param = Object.keys(params) - inv_param_names;
            // if (unexp_param !== []){
            //     throw new ECpayError.ECpayInvalidParam(`Unexpected parameter in Invoice parameters ${unexp_param}`);
            // }

            // 2. 比對特殊欄位值相依需求
            // a [CarruerType]為1 => CustomerID 不能為空
            if (params['CarruerType'] === '1'){
                if (params['CustomerID'] === ''){
                    throw new ECpayError.ECpayInvoiceRuleViolate(`[CustomerID] can not be empty when [CarruryType] is 1.`);
                }
            } // [CustomerID]不為空 => CarruerType 不能為空
            else if (params['CarruerType'] === ''){
                if (params['CustomerID'] !== ''){
                    throw new ECpayError.ECpayInvoiceRuleViolate(`[CarruerType] can not be empty when [CustomerID] is not empty.`);
                }
            }
            // b 列印註記[Print]為1 => CustomerName, CustomerAddr 不能為空
            if (params['Print'] === '1'){
                if (params['CustomerName'] === '' && params['CustomerAddr'] === ''){
                    throw new ECpayError.ECpayInvoiceRuleViolate(`[CustomerName] and [CustomerAddr] can not be empty when [Print] is 1.`);
                }
                if (params['CustomerID'] !== ''){
                    throw new ECpayError.ECpayInvoiceRuleViolate(`[Print] can not be '1' when [CustomerID] is not empty.`);
                }
            }
            // c CustomerPhone和CustomerEmail至少一個要有值
            if (params['CustomerPhone'] === '' && params['CustomerEmail'] === ''){
                throw new ECpayError.ECpayInvoiceRuleViolate(`[CustomerPhone] and [CustomerEmail] can not both be empty.`);
            }
            // d 別[TaxType]為2 => ClearanceMark = 1 or 2 and InvoiceItemTaxType must include '2'
            if (params['TaxType'] === '2'){
                if (params['ClearanceMark'] !== '1' && params['ClearanceMark'] !== '2'){
                    throw new ECpayError.ECpayInvoiceRuleViolate(`[ClearanceMark] has to be 1 or 2 when [TaxType] is 2.`);
                }
                if (!params['InvoiceItemTaxType'].includes('2')){
                    throw new ECpayError.ECpayInvoiceRuleViolate(`[InvoiceItemTaxType] must contain at lease one '2' when [TaxType] is 2.`);
                }
            }
            // e 統一編號[CustomerIdentifier]有值時 => CarruerType != 1 or 2, Donation = 0, Print = 1
            if (params['CustomerIdentifier'] !== ''){
                if (params['CarruerType'] === '1' || params['CarruerType'] === '2'){
                    throw new ECpayError.ECpayInvoiceRuleViolate(`[CarruerType] Cannot be 1 or 2 when [CustomerIdentifier] is given.`);
                }
            }
            // [CarruerType]為'' or 1 時 : CarruerNum = '', [CarruerType]為2, CarruerNum = 固定長度為16且格式為2碼大小寫字母加上14碼數字。
            // [CarruerType]為3, 固定長度為8且格式為1碼斜線「/」加上7碼數字及大小寫字母組成
            if (params['CarruerType'] === '' || params['CarruerType'] === '1'){
                if (params['CarruerNum'] !== ''){
                    throw new ECpayError.ECpayInvoiceRuleViolate(`[CarruerNum] must be empty when [CarruerType] is empty or 1.`);
                }
            } else if (params['CarruerType'] === '2'){
                if (params['CarruerNum'].match(new RegExp(/[A-Za-z]{2}[0-9]{14}/)) === null){
                    throw new ECpayError.ECpayInvoiceRuleViolate(`[CarruerNum] must be 2 alphabets and 14 numbers when [CarruerType] is 2.`);
                }
            } else if (params['CarruerType'] === '3'){
                if (params['CarruerNum'].match(new RegExp(/^\/[A-Za-z0-9\s+-.]{7}$/)) === null){
                    throw new ECpayError.ECpayInvoiceRuleViolate(`[CarruerNum] must start with '/' followed by 7 alphabet and number characters when [CarruerType] is 3.`);
                }
            } else {
                throw new ECpayError.ECpayInvoiceRuleViolate(`Unexpected value in [CarruerType].`);
            }
            // [CarruerType]有值時，Print必須有為0
            if (params['CarruerType'] !== '' && params['Print'] !== '0'){
                throw new  ECpayError.ECpayInvoiceRuleViolate(`[Print] must be 0 when [CarruerType] has value.`);
            }
            // Donation = 1 => LoveCode不能為空, Print = 0
            if (params['Donation'] === '1'){
                if (params['LoveCode'] === ''){
                    throw new ECpayError.ECpayInvoiceRuleViolate(`[LoveCode] cannot be empty when [Donation] is 1.`);
                }
                if (params['Print'] !== '0'){
                    throw new ECpayError.ECpayInvoiceRuleViolate(`[Print] must be 0 when [Donation] is 1.`);
                }
            }

            // 3. 比對商品名稱，數量，單位，價格，tax項目數量是否一致
            let item_params = ['InvoiceItemCount', 'InvoiceItemWord', 'InvoiceItemPrice', 'InvoiceItemTaxType'];
            // 商品名稱含有管線 => 認為是多樣商品 *InvoiceItemName, *InvoiceItemCount, *InvoiceItemWord, *InvoiceItemPrice, *InvoiceItemTaxType逐一用管線分割，計算數量後與第一個比對
            if (params['InvoiceItemName'] === ''){
                throw new ECpayError.ECpayInvoiceRuleViolate(`[InvoiceItemName] is empty.`);
            } else {
                if (params['InvoiceItemName'].includes('|')){
                    let item_cnt = params['InvoiceItemName'].split('|').length;
                    item_params.forEach(function (param_name) {
                        // Check if there's empty value.
                        if (params[param_name].match(new RegExp(/(\|\||^\||\|$)/)) !== null){
                            throw new ECpayError.ECpayInvoiceRuleViolate(`[${param_name}] contains empty value.`);
                        }
                        let p_cnt = params[param_name].split('|').length;
                        if (item_cnt !== p_cnt){
                            throw new ECpayError.ECpayInvoiceRuleViolate(`Count of item info [${param_name}] (${p_cnt}) not match count from [InvoiceItemName] (${item_cnt}).`);
                        }
                    });
                    // 課稅類別[TaxType] = 9時 => InvoiceItemTaxType 能含有1,2,3(and at least contains one 1 and other)
                    let item_tax = params['InvoiceItemTaxType'].split('|');
                    let aval_tax_type = ['1', '2', '3'];
                    let vio_tax_t = item_tax - aval_tax_type;
                    if (vio_tax_t === []){
                        throw new ECpayError.ECpayInvoiceRuleViolate(`Illegal [InvoiceItemTaxType]: ${vio_tax_t}`);
                    }
                    if (params['TaxType'] === '9'){
                        if (!item_tax.includes('1')){
                            throw new ECpayError.ECpayInvoiceRuleViolate(`[InvoiceItemTaxType] must contain at lease one '1'.`);
                        }
                        if (item_tax.includes('2') && item_tax.includes('3')){
                            throw new ECpayError.ECpayInvoiceRuleViolate(`[InvoiceItemTaxType] cannot contain 2 and 3 at the same time.`);
                        }
                    }
                } else {
                    // 沒有管線 => 逐一檢查後4項有無管線
                    item_params.forEach(function (param_name) {
                        if (params[param_name].includes('|')){
                            throw new ECpayError.ECpayInvoiceRuleViolate(`Item info [${param_name}] contain pipeline delimiter but there's only one item in param [InvoiceItemName].`);
                        }
                    });
                }
            }
            // 4. 比對所有欄位Pattern
            this.verify_param_by_pattern(params, this.all_param_pattern);
        } else {
            throw TypeError(`Received argument is not a object.`);
        }
    }
}

class QueryParamVerify extends PaymentVerifyBase{
    constructor(apiname){
        super();
        this.aio_basic_param = this.get_basic_params(apiname);
        this.aio_conditional_param = this.get_cond_param(apiname);
        this.all_param_pattern = this.get_all_pattern(apiname);
    }

    verify_query_param(params){
        if (params.constructor === Object){
            let basic_param = this.aio_basic_param.sort();
            let input_param = Object.keys(params).sort();
            basic_param.forEach(function (pname) {
                if (input_param.indexOf(pname, 0) === -1){
                    throw new ECpayError.ECpayInvalidParam(`Lack required param ${pname}`);
                }
            });

            // Verify Value pattern of each param
            this.verify_param_by_pattern(params, this.all_param_pattern);
        } else {
          throw new TypeError(`Received argument is not a object`);
        }
    }
}

class ActParamVerify extends PaymentVerifyBase{
    constructor(apiname){
        super();
        this.aio_basic_param = this.get_basic_params(apiname);
        this.aio_conditional_param = this.get_cond_param(apiname);
        this.all_param_pattern = this.get_all_pattern(apiname);
    }

    verify_act_param(params){
        if (params.constructor === Object){
            let basic_param = this.aio_basic_param.sort();
            let input_param = Object.keys(params).sort();
            basic_param.forEach(function (pname) {
                if (input_param.indexOf(pname, 0) === -1){
                    throw new ECpayError.ECpayInvalidParam(`Lack required param ${pname}`);
                }
            });

            // Verify Value pattern of each param
            this.verify_param_by_pattern(params, this.all_param_pattern);
        } else {
            throw new TypeError(`Received argument is not a object`);
        }
    }
}
module.exports = {
    PaymentVerifyBase: PaymentVerifyBase,
    AioCheckOutParamVerify: AioCheckOutParamVerify,
    QueryParamVerify: QueryParamVerify,
    ActParamVerify: ActParamVerify
};