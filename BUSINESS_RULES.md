# SupplyChainIQ — Enterprise Business Rules & Analytical Formulas

This document defines the authoritative business rules, formulas, and analytical logic enforced across all intelligence modules within SupplyChainIQ.

---

## 1. Inventory & Stock Health Rules

### Average Daily Demand (ADD)
$$\text{ADD} = \frac{\text{Sum of Demand Units Over Trailing 90 Days}}{90}$$

### Stock Cover Days
$$\text{Cover Days} = \frac{\text{On-Hand Units}}{\max(\text{ADD}, 0.1)}$$

### Reorder Point (ROP) Units
$$\text{ROP} = \text{Safety Stock Units} + (\text{ADD} \times \text{Primary Supplier Lead Time Days})$$

### Position Status Taxonomy
- **`STOCKOUT`**: $\text{On-Hand Units} = 0$
- **`CRITICAL`**: $\text{On-Hand Units} < \text{Safety Stock Units}$
- **`REORDER`**: $\text{Safety Stock Units} \le \text{On-Hand Units} < \text{Reorder Point Units}$
- **`HEALTHY`**: $\text{Reorder Point Units} \le \text{On-Hand Units} \le (\text{ADD} \times 90)$
- **`OVERSTOCK`**: $\text{On-Hand Units} > (\text{ADD} \times 90)$ (Cover > 90 Days)

---

## 2. Supplier Performance & Risk Model

### Composite Supplier Risk Score (0–100)
$$\text{Risk Score} = (\text{Financial Risk} \times 0.35) + (\text{Geopolitical Risk} \times 0.35) + (\text{Capacity Risk} \times 0.30)$$

### On-Time In-Full Delivery Rate (OTIF %)
$$\text{OTIF \%} = \left(\frac{\text{Orders Delivered On-Time \& In-Full}}{\text{Total Orders Delivered}}\right) \times 100$$

### Supplier Status Thresholds
- **`CRITICAL_RISK`**: $\text{Risk Score} \ge 60$ or $\text{OTIF} < 85\%$
- **`AT_RISK`**: $40 \le \text{Risk Score} < 60$ or $85\% \le \text{OTIF} < 92\%$
- **`ACTIVE`**: $\text{Risk Score} < 40$ and $\text{OTIF} \ge 92\%$

---

## 3. Demand Forecasting & Accuracy Metrics

### Mean Absolute Percentage Error (MAPE %)
$$\text{MAPE} = \left(\frac{1}{n} \sum_{i=1}^{n} \frac{|\text{Forecast}_i - \text{Actual}_i|}{\max(\text{Actual}_i, 1)}\right) \times 100$$

### Forecast Bias %
$$\text{Bias} = \left(\frac{1}{n} \sum_{i=1}^{n} \frac{\text{Forecast}_i - \text{Actual}_i}{\max(\text{Actual}_i, 1)}\right) \times 100$$
- Positive Bias ($> 0$): Over-forecasting (excess inventory risk)
- Negative Bias ($< 0$): Under-forecasting (stockout risk)

---

## 4. Alert & Financial Exposure Engine

### Stockout Financial Exposure
$$\text{Exposure}_{\text{stockout}} = (\text{Reorder Point Units} - \text{On-Hand Units}) \times \text{SKU Unit Selling Price} \times 0.35$$

### Supplier Breach Exposure
$$\text{Exposure}_{\text{supplier}} = \text{Annual Spend USD} \times 0.04$$

### Logistics Delay Exposure
$$\text{Exposure}_{\text{shipment}} = \text{Freight Cost USD} \times 0.50$$

---

## 5. Scenario Stress Testing Logic

### Baseline Demand Shock
$$\text{Scenario Revenue} = \text{Baseline Annual Revenue} \times (1 + \Delta_{\text{Demand \%}})$$

### Baseline Freight Rate Shock
$$\text{Scenario Freight Spend} = \text{Baseline Freight Spend} \times (1 + \Delta_{\text{Freight \%}})$$

### Lead Time Delay Working Capital Impact
$$\text{Scenario Capital Exposure} = \text{Baseline Open PO Value} \times \left(1 + \frac{\text{Added Lead Time Days}}{30}\right)$$
