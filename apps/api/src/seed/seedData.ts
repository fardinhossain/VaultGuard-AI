import { CustomerPIIPayload, generateApiKey } from '@vaultguard/crypto-core';
import { keyProvider } from '../config/db.js';
import { ApiKeyModel } from '../models/ApiKey.js';
import { EncryptedRecordModel } from '../models/EncryptedRecord.js';
import { ExternalStoreOrderModel } from '../models/ExternalStoreOrder.js';
import { TenantModel } from '../models/Tenant.js';
import { encryptExternalPayload } from '../modules/cryptoProxy/cryptoProxy.routes.js';
import { createEncryptedCustomerRecord } from '../modules/records/records.service.js';

const SUPERSHOP_SYNTHETIC_CUSTOMERS: CustomerPIIPayload[] = [
  {
    name: 'Fardin Hossain',
    phone: '01712345678',
    email: 'fardin.demo@example.com',
    address: 'House 14, Road 7, Dhanmondi, Dhaka',
    orderTotal: '৳4,850',
  },
  {
    name: 'Nusrat Jahan',
    phone: '01819876543',
    email: 'nusrat.demo@example.com',
    address: 'Flat 4B, Sector 11, Uttara, Dhaka',
    orderTotal: '৳12,400',
  },
  {
    name: 'Tanvir Ahmed',
    phone: '01911223344',
    email: 'tanvir.demo@example.com',
    address: 'Block C, Banani, Dhaka',
    orderTotal: '৳2,190',
  },
  {
    name: 'Farzana Akter',
    phone: '01677889900',
    email: 'farzana.demo@example.com',
    address: 'Mirpur DOHS, Avenue 3, Dhaka',
    orderTotal: '৳7,620',
  },
  {
    name: 'Mahmudul Hasan',
    phone: '01555667788',
    email: 'mahmud.demo@example.com',
    address: 'Agrabad C/A, Chattogram',
    orderTotal: '৳9,310',
  },
];

const QUICKKART_SYNTHETIC_CUSTOMERS: CustomerPIIPayload[] = [
  {
    name: 'Sadia Rahman',
    phone: '01755443322',
    email: 'sadia.demo@example.com',
    address: 'Road 12, Gulshan 1, Dhaka',
    orderTotal: '৳6,450',
  },
  {
    name: 'Rafiqul Islam',
    phone: '01844332211',
    email: 'rafiq.demo@example.com',
    address: 'Zindabazar, Sylhet',
    orderTotal: '৳3,180',
  },
];

export async function seedDatabaseIfEmpty(): Promise<void> {
  const existingTenants = await TenantModel.find().lean();
  for (const tenant of existingTenants) {
    keyProvider.syncTenantKeyVersion(tenant.tenantId, tenant.activeKeyVersion);
  }

  if (existingTenants.length > 0) {
    console.log(`[seed] Existing tenants detected (${existingTenants.length}); checking API keys & external store seed...`);
    await seedApiKeysAndExternalStoreIfEmpty();
    return;
  }

  console.log('[seed] Seeding synthetic Bangladeshi tenants and encrypted records...');

  await TenantModel.create([
    {
      tenantId: 'tenant_supershop_bd',
      name: 'SuperShop BD',
      industry: 'Supermarket & Retail',
      contactEmail: 'admin@supershop.bd',
      region: 'ap-south-1 / Dhaka Local Node',
      deploymentMode: 'cloud',
      keyProvider: 'local-dev-kms',
      activeKeyVersion: 1,
      keyReferenceId: 'arn:vaultguard:kms:dhaka:supershop-kek',
      planTier: 'basic',
      billingCycle: 'monthly',
      maxApiKeys: 15,
      monthlyRecordLimit: 100000,
    },
    {
      tenantId: 'tenant_quickkart_bd',
      name: 'QuickKart E-Commerce',
      industry: 'Online Marketplace',
      contactEmail: 'secops@quickkart.bd',
      region: 'ap-south-1 / Dhaka Local Node',
      deploymentMode: 'hybrid',
      keyProvider: 'local-dev-kms',
      activeKeyVersion: 1,
      keyReferenceId: 'arn:vaultguard:kms:dhaka:quickkart-kek',
      planTier: 'premium',
      billingCycle: 'yearly',
      maxApiKeys: 100,
      monthlyRecordLimit: 2000000,
    },
  ]);

  keyProvider.syncTenantKeyVersion('tenant_supershop_bd', 1);
  keyProvider.syncTenantKeyVersion('tenant_quickkart_bd', 1);

  for (let i = 0; i < SUPERSHOP_SYNTHETIC_CUSTOMERS.length; i += 1) {
    const payload = SUPERSHOP_SYNTHETIC_CUSTOMERS[i]!;
    await createEncryptedCustomerRecord({
      tenantId: 'tenant_supershop_bd',
      actorId: 'seed_bootstrap',
      actorRole: 'system',
      payload,
      recordId: `rec_ssbd_00${i + 1}`,
    });
  }

  for (let i = 0; i < QUICKKART_SYNTHETIC_CUSTOMERS.length; i += 1) {
    const payload = QUICKKART_SYNTHETIC_CUSTOMERS[i]!;
    await createEncryptedCustomerRecord({
      tenantId: 'tenant_quickkart_bd',
      actorId: 'seed_bootstrap',
      actorRole: 'system',
      payload,
      recordId: `rec_qkbd_00${i + 1}`,
    });
  }

  await seedApiKeysAndExternalStoreIfEmpty();

  const totalCount = await EncryptedRecordModel.countDocuments();
  console.log(
    `[seed] Complete: ${totalCount} synthetic records encrypted with AES-256-GCM (zero plaintext stored).`,
  );
}

async function seedApiKeysAndExternalStoreIfEmpty(): Promise<void> {
  const existingKeys = await ApiKeyModel.countDocuments();
  if (existingKeys === 0) {
    const adminGen = generateApiKey('live', 'supershop');
    const deliveryGen = generateApiKey('live', 'supershop');
    const marketingGen = generateApiKey('live', 'supershop');
    const quickkartGen = generateApiKey('live', 'quickkart');

    await ApiKeyModel.create([
      {
        keyId: 'key_ssbd_admin_01',
        tenantId: 'tenant_supershop_bd',
        name: 'SuperShop Checkout Admin Connector',
        keyPrefix: adminGen.keyPrefix,
        keyHash: adminGen.keyHash,
        roleScope: 'admin',
        status: 'active',
        requestCount: 14,
      },
      {
        keyId: 'key_ssbd_delivery_01',
        tenantId: 'tenant_supershop_bd',
        name: 'Delivery Rider Mobile App Key',
        keyPrefix: deliveryGen.keyPrefix,
        keyHash: deliveryGen.keyHash,
        roleScope: 'delivery',
        status: 'active',
        requestCount: 9,
      },
      {
        keyId: 'key_ssbd_marketing_01',
        tenantId: 'tenant_supershop_bd',
        name: 'Marketing Analytics BI Key',
        keyPrefix: marketingGen.keyPrefix,
        keyHash: marketingGen.keyHash,
        roleScope: 'marketing',
        status: 'active',
        requestCount: 2,
      },
      {
        keyId: 'key_qkbd_admin_01',
        tenantId: 'tenant_quickkart_bd',
        name: 'QuickKart Checkout Connector',
        keyPrefix: quickkartGen.keyPrefix,
        keyHash: quickkartGen.keyHash,
        roleScope: 'admin',
        status: 'active',
        requestCount: 5,
      },
    ]);
  }

  const existingOrders = await ExternalStoreOrderModel.countDocuments();
  if (existingOrders === 0) {
    await ExternalStoreOrderModel.create({
      orderId: 'extord_legacy_1001',
      storeTenantId: 'tenant_supershop_bd',
      orderNumber: 'ORD-BD-1001',
      itemsSummary: '1x Rice 5kg, 2x Cooking Oil (Unprotected Legacy Row)',
      protectedByVaultGuard: false,
      plaintextCustomer: {
        name: 'Tariqul Islam (Legacy)',
        phone: '01711009988',
        email: 'tariq.legacy@example.com',
        address: 'Road 9, Mohammadpur, Dhaka',
        orderTotal: '৳2,950',
      },
    });

    const enc1 = await encryptExternalPayload({
      tenantId: 'tenant_supershop_bd',
      actorId: 'key_ssbd_admin_01',
      actorRole: 'admin',
      data: {
        name: 'Nadia Sultana',
        phone: '01722998877',
        email: 'nadia.store@example.com',
        address: 'House 8, Road 12, Banani, Dhaka',
        orderTotal: '৳6,480',
      },
      blindIndexFields: ['phone'],
      recordId: 'extord_vg_1002',
    });

    const enc2 = await encryptExternalPayload({
      tenantId: 'tenant_supershop_bd',
      actorId: 'key_ssbd_admin_01',
      actorRole: 'admin',
      data: {
        name: 'Ashraful Alam',
        phone: '01855443322',
        email: 'ashraf.store@example.com',
        address: 'Sector 4, Uttara, Dhaka',
        orderTotal: '৳3,790',
      },
      blindIndexFields: ['phone'],
      recordId: 'extord_vg_1003',
    });

    await ExternalStoreOrderModel.create([
      {
        orderId: 'extord_vg_1002',
        storeTenantId: 'tenant_supershop_bd',
        orderNumber: 'ORD-BD-1002',
        itemsSummary: '3x Baby Formula, 1x Olive Oil',
        protectedByVaultGuard: true,
        apiKeyPrefixUsed: 'vg_live_supersho_...',
        encryptedEnvelope: enc1.envelope,
        blindIndexes: enc1.blindIndexes,
      },
      {
        orderId: 'extord_vg_1003',
        storeTenantId: 'tenant_supershop_bd',
        orderNumber: 'ORD-BD-1003',
        itemsSummary: '2x Organic Honey, 4x Tea Pack',
        protectedByVaultGuard: true,
        apiKeyPrefixUsed: 'vg_live_supersho_...',
        encryptedEnvelope: enc2.envelope,
        blindIndexes: enc2.blindIndexes,
      },
    ]);
  }
}
