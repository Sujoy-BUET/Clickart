# Seller Product Management Guide

## Overview
Sellers can now add products with **custom categories** and **dynamic variations** (colors, sizes, etc.) with individual stock management. The system automatically creates new categories and variation types as needed.

---

## 1. Add Product with Custom Category and Variations

### Endpoint
```
POST /api/products
```

### Request Body
```json
{
  "product_name": "Premium T-Shirt",
  "description": "High-quality cotton t-shirt",
  "price": 500,
  "stock_quantity": 100,
  "product_image": "tshirt.jpg",
  "seller_id": 1,
  "category_name": "Apparel",
  "brand_id": 1,
  "variations": [
    {
      "variation_type": "Color",
      "variation_value": "Red",
      "price": 500,
      "stock_quantity": 30
    },
    {
      "variation_type": "Color",
      "variation_value": "Blue",
      "price": 500,
      "stock_quantity": 25
    },
    {
      "variation_type": "Size",
      "variation_value": "M",
      "price": 500,
      "stock_quantity": 50
    },
    {
      "variation_type": "Size",
      "variation_value": "L",
      "price": 550,
      "stock_quantity": 40
    }
  ]
}
```

### Request Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `product_name` | String | ✅ Yes | Name of the product |
| `description` | String | ❌ No | Product description |
| `price` | Number | ✅ Yes | Base price (used if variation price not specified) |
| `stock_quantity` | Number | ❌ No | Base stock (used if variation stock not specified) |
| `product_image` | String | ❌ No | Image URL/path |
| `seller_id` | Number | ✅ Yes | Seller's ID |
| `category_name` | String | ✅ Yes* | Category name (creates if new) |
| `category_id` | Number | ✅ Yes* | Category ID (if using existing) |
| `brand_id` | Number | ✅ Yes | Brand ID |
| `variations` | Array | ❌ No | Array of variation objects |

### Variation Object Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `variation_type` | String | ✅ Yes | Type of variation (Color, Size, Material, etc.) |
| `variation_value` | String | ✅ Yes | Value of the variation (Red, M, Cotton, etc.) |
| `price` | Number | ❌ No | Price for this variation (falls back to base price) |
| `stock_quantity` | Number | ❌ No | Stock for this variation |

### Response
```json
{
  "success": true,
  "data": {
    "product_id": 10,
    "product_name": "Premium T-Shirt",
    "description": "High-quality cotton t-shirt",
    "price": 500,
    "stock_quantity": 100,
    "product_image": "tshirt.jpg",
    "seller_id": 1,
    "category_id": 5,
    "brand_id": 1,
    "category_name": "Apparel",
    "brand_name": "MyBrand",
    "store_name": "MyStore",
    "variations": [
      {
        "product_variation_id": 45,
        "product_id": 10,
        "variation_id": 12,
        "price": 500,
        "stock_quantity": 30
      },
      {
        "product_variation_id": 46,
        "product_id": 10,
        "variation_id": 13,
        "price": 500,
        "stock_quantity": 25
      }
    ]
  }
}
```

---

## 2. Add Variations to Existing Product

### Endpoint
```
POST /api/products/:id/variations
```

### Request Body (Option 1: With variation_id)
```json
{
  "variation_id": 12,
  "price": 500,
  "stock_quantity": 50
}
```

### Request Body (Option 2: With variation_type and variation_value)
```json
{
  "variation_type": "Size",
  "variation_value": "XL",
  "price": 550,
  "stock_quantity": 30
}
```

### Response
```json
{
  "success": true,
  "data": {
    "product_variation_id": 47,
    "product_id": 10,
    "variation_id": 14,
    "price": 550,
    "stock_quantity": 30
  }
}
```

---

## 3. Get All Variation Types

Use this to show sellers available variation types when adding products.

### Endpoint
```
GET /api/products/variations/types
```

### Response
```json
{
  "success": true,
  "data": [
    {
      "variation_type_id": 1,
      "variation_type_name": "Color"
    },
    {
      "variation_type_id": 2,
      "variation_type_name": "Size"
    },
    {
      "variation_type_id": 3,
      "variation_type_name": "Material"
    },
    {
      "variation_type_id": 4,
      "variation_type_name": "RAM/ROM"
    }
  ]
}
```

---

## 4. Get Variation Values for a Type

Get all available values for a specific variation type.

### Endpoint
```
GET /api/products/variations/types/:variation_type_id/values
```

### Response
```json
{
  "success": true,
  "data": [
    {
      "variation_id": 1,
      "variation_value": "Red"
    },
    {
      "variation_id": 2,
      "variation_value": "Blue"
    },
    {
      "variation_id": 3,
      "variation_value": "Green"
    }
  ]
}
```

---

## 5. Get All Categories

### Endpoint
```
GET /api/products/categories
```

### Response
```json
{
  "success": true,
  "data": [
    {
      "category_id": 1,
      "category_name": "Electronics"
    },
    {
      "category_id": 2,
      "category_name": "Clothing"
    },
    {
      "category_id": 5,
      "category_name": "Apparel"
    }
  ]
}
```

---

## 6. Get Product with Variations

### Endpoint
```
GET /api/products/:id
```

### Response
```json
{
  "success": true,
  "data": {
    "product_id": 10,
    "product_name": "Premium T-Shirt",
    "description": "High-quality cotton t-shirt",
    "price": 500,
    "stock_quantity": 100,
    "category_name": "Apparel",
    "brand_name": "MyBrand",
    "store_name": "MyStore",
    "variations": [
      {
        "product_variation_id": 45,
        "price": 500,
        "stock_quantity": 30,
        "variation_type": "Color",
        "variation_value": "Red"
      },
      {
        "product_variation_id": 46,
        "price": 500,
        "stock_quantity": 25,
        "variation_type": "Color",
        "variation_value": "Blue"
      },
      {
        "product_variation_id": 47,
        "price": 500,
        "stock_quantity": 50,
        "variation_type": "Size",
        "variation_value": "M"
      }
    ]
  }
}
```

---

## Example: Complete Seller Workflow

### 1. Seller logs in
```bash
POST /api/sellers/login
{
  "seller_name": "john_seller",
  "seller_password": "pass123"
}
```

### 2. Seller fetches variation types
```bash
GET /api/products/variations/types
```

### 3. Seller adds a new product with custom category and variations
```bash
POST /api/products
{
  "product_name": "Wireless Headphones",
  "description": "Premium noise-cancelling headphones",
  "price": 2999,
  "stock_quantity": 100,
  "product_image": "headphones.jpg",
  "seller_id": 5,
  "category_name": "Electronics",
  "brand_id": 3,
  "variations": [
    {
      "variation_type": "Color",
      "variation_value": "Black",
      "price": 2999,
      "stock_quantity": 40
    },
    {
      "variation_type": "Color",
      "variation_value": "White",
      "price": 2999,
      "stock_quantity": 35
    },
    {
      "variation_type": "Color",
      "variation_value": "Blue",
      "price": 3299,
      "stock_quantity": 25
    }
  ]
}
```

### 4. Later, seller adds more variations to the same product
```bash
POST /api/products/15/variations
{
  "variation_type": "Color",
  "variation_value": "Gold",
  "price": 3499,
  "stock_quantity": 15
}
```

### 5. Seller views product with all variations
```bash
GET /api/products/15
```

---

## Key Features

✅ **Custom Categories**: Sellers can create new categories on the fly  
✅ **Dynamic Variations**: Add any variation type (Color, Size, Material, etc.)  
✅ **Individual Stock Management**: Each variation has its own stock count  
✅ **Flexible Pricing**: Each variation can have a different price  
✅ **Auto-creation**: New variation types and values are created automatically  
✅ **Backward Compatible**: Still supports existing variation_id approach  

---

## Important Notes

1. **Category Name**: Either `category_name` (to create new) or `category_id` (to use existing) must be provided
2. **Variations are Optional**: You can add a product without variations initially, then add them later
3. **Stock Quantity**: 
   - If a variation doesn't have `stock_quantity`, it uses the base product's `stock_quantity`
   - If base product also doesn't have it, it can be `null`
4. **Price**: 
   - If a variation doesn't have `price`, it uses the base product's `price`
   - This ensures consistent pricing if not overridden
5. **Duplicate Prevention**: Adding the same variation twice updates the existing one instead of creating a duplicate

