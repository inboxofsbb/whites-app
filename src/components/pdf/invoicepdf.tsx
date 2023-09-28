import { getTransformHandlesFromCoords } from "@excalidraw/excalidraw/types/element";
import {
  Page,
  Document,
  StyleSheet,
  Text,
  Image,
  View,
} from "@react-pdf/renderer";
import { DateTime } from "luxon";
import { Fragment } from "react";
const borderColor = "#3778C2";

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#fff",
    fontSize: 11,
    paddingTop: 30,
    paddingLeft: 50,
    paddingRight: 50,
    lineHeight: 1.5,
    flexDirection: "column",
    fontFamily: "Helvetica",
  },

  logo: {
    width: 110,
    height: 27,
    marginLeft: "auto",
    marginRight: "auto",
    position: "absolute",
    left: 0,
  },
  pageNumbers: {
    marginHorizontal:50,
    position: "absolute",
    borderTopWidth:1,
    borderColor: "#3778C2",
    paddingTop:7,
    bottom: 16,
    left: 0,
    right: 0,
    textAlign: "center",
  },
  reportTitle: {
    color: "#3778C2",
    fontWeight: "black",
    fontSize: 22,
    textAlign: "center",
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
  },
});

const InvoiceTitle = ({ title }: any) => (
  <View>
    <Text style={styles.reportTitle}>{title}</Text>
  </View>
);

const InvoiceNo = ({ invoice }: any) => (
  <View>
    <Image style={styles.logo} src={"/assets/images/tcomp_logo.png"} />

    <View
      style={{
        flexDirection: "row",
        justifyContent: "flex-end",
        alignItems: "center",
        alignContent: "center",
      }}
    >
      <Text style={{ marginRight: 4 }}>Date: </Text>
      <Text
        style={{
          fontSize: 13,
          fontStyle: "bold",
        }}
      >
        {DateTime.fromISO(invoice.date).toFormat("dd LLL yyyy")}
      </Text>
    </View>
    <View
      style={{
        flexDirection: "row",
        justifyContent: "flex-end",
        alignItems: "center",
        alignContent: "center",
      }}
    >
      <Text style={{ marginRight: 3 }}>Invoice no:</Text>
      <Text
        style={{
          fontSize: 13,
          fontStyle: "bold",
        }}
      >
        #{invoice.invoiceNo}
      </Text>
    </View>
  </View>
);

const InvoiceTo = ({ invoice }: any) => (
  <Fragment>
    <View
      style={{
        position: "absolute",
        textAlign: "right",
        right: 48,
        top: "110px",
        marginTop: 36,
        width: "40%",
      }}
    >
      <Text
        style={{
          fontSize: 14,
          fontStyle: "bold",
        }}
      >
        Billing period
      </Text>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "flex-end",
          alignItems: "center",
          alignContent: "center",
        }}
      >
        <Text style={{ marginRight: 4 }}>From: </Text>
        <Text
          style={{
            fontSize: 13,
            fontStyle: "bold",
          }}
        >
          {DateTime.fromISO(invoice.billingFrom).toFormat("dd LLL yyyy")}
        </Text>
      </View>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "flex-end",
          alignItems: "center",
          alignContent: "center",
        }}
      >
        <Text style={{ marginRight: 4 }}>To: </Text>
        <Text
          style={{
            fontSize: 13,
            fontWeight: "heavy",
            fontStyle: "bold",
          }}
        >
          {DateTime.fromISO(invoice.billingTo).toFormat("dd LLL yyyy")}
        </Text>
      </View>
    </View>
    <View
      style={{
        position: "absolute",
        left: 48,
        top: "110px",
        marginTop: 36,
        width: "50%",
      }}
    >
      <Text
        style={{
          fontSize: 14,
          fontStyle: "bold",
        }}
      >
        To
      </Text>
      <Text>{invoice.invoiceTo}</Text>
      <Text>{invoice.invoiceAddress}</Text>
    </View>
  </Fragment>
);

const InvoiceItemsTableHeader = () => (
  <View
  fixed
    style={{
      flexDirection: "row",
      borderBottomColor: "#3778C2",
      backgroundColor: "#3778C2",
      color: "#fff",
      borderBottomWidth: 1,
      alignItems: "center",
      height: 24,
      textAlign: "center",
      fontStyle: "bold",
      flexGrow: 1,
    }}
  >
    <Text
      style={{
        width: "5%",
        borderRightColor: borderColor,
        borderRightWidth: 1,
      }}
    >
      Sl.No
    </Text>
    <Text
      style={{
        width: "45%",
        borderRightColor: borderColor,
        borderRightWidth: 1,
      }}
    >
      Description
    </Text>
    <Text
      style={{
        width: "10%",
        borderRightColor: borderColor,
        borderRightWidth: 1,
      }}
    >
      Qty
    </Text>
    <Text
      style={{
        width: "10%",
        borderRightColor: borderColor,
        borderRightWidth: 1,
      }}
    >
      Days
    </Text>
    <Text
      style={{
        width: "15%",
        borderRightColor: borderColor,
        borderRightWidth: 1,
      }}
    >
      Unit Price (KD)
    </Text>
    <Text
      style={{
        width: "15%",
      }}
    >
      Total (KD)
    </Text>
  </View>
);
const InvoiceTableRow = ({ items }: any) => {
  const rows = items?.map((item: any) => (
    <View
      style={{
        flexDirection: "row",
        borderBottomColor: "#3778C2",
        borderBottomWidth: 1,
        alignItems: "center",
        fontStyle: "bold",
      }}
      key={item.slNo}
    >
      <Text
        style={{
          width: "5%",
          paddingLeft: 8,
          paddingTop: 3,
        }}
      >
        {item.slNo}
      </Text>
      <Text
        style={{
          width: "45%",
          paddingLeft: 8,
          paddingTop: 3,
        }}
      >
        {item.description}
      </Text>
      <Text
        style={{
          width: "10%",
          textAlign: "right",
          paddingRight: 8,
          paddingTop: 3,
        }}
      >
        {item.qty}
      </Text>
      <Text
        style={{
          width: "10%",
          paddingTop: 3,
          textAlign: "right",
          paddingRight: 8,
        }}
      >
        {item.days}
      </Text>
      <Text
        style={{
          width: "15%",
          paddingTop: 3,
          textAlign: "right",
          paddingRight: 8,
        }}
      >
        {Number(item.unitPrice).toFixed(3)}
      </Text>
      <Text
        style={{
          width: "15%",
          textAlign: "right",
          paddingRight: 8,
        }}
      >
        {(item.qty * item.unitPrice * item.days).toFixed(3)}
      </Text>
    </View>
  ));
  return <Fragment>{rows}</Fragment>;
};

const InvoiceTableFooter = ({ invoice }: any) => {
  const total = invoice?.items
    ?.map((item: any) => item.qty * item.unitPrice * item.days)
    .reduce(
      (accumulator: any, currentValue: any) => accumulator + currentValue,
      0
    );
  return (
    <Fragment>
      <View
        style={{
          flexDirection: "row",

          alignItems: "center",
          height: 24,
          fontSize: 12,
        }}
      >
        <Text
          style={{
            width: "85%",
            textAlign: "right",
            paddingRight: 8,
          }}
        >
          Amount :
        </Text>
        <Text
          style={{
            width: "15%",
            textAlign: "right",
            paddingRight: 8,
          }}
        >
          {Number.parseFloat(total).toFixed(3)} KD
        </Text>
      </View>
      <View
        style={{
          flexDirection: "row",

          alignItems: "center",
          height: 24,
          fontSize: 12,
        }}
      >
        <Text
          style={{
            width: "85%",
            textAlign: "right",

            paddingRight: 8,
          }}
        >
          Tax ({invoice?.tax}%) :
        </Text>
        <Text
          style={{
            width: "15%",
            textAlign: "right",
            paddingRight: 8,
          }}
        >
          {(
            (Number.parseFloat(total) * Number.parseFloat(invoice?.tax)) /
            100
          ).toFixed(3)}{" "}
          KD
        </Text>
      </View>
      <View
        style={{
          flexDirection: "row",

          alignItems: "center",
          height: 24,
          fontSize: 12,
          fontStyle: "bold",
        }}
      >
        <Text
          style={{
            width: "85%",
            textAlign: "right",
            fontWeight: "heavy",
            fontFamily: "Helvetica-Bold",
            paddingRight: 8,
          }}
        >
          TOTAL :
        </Text>
        <Text
          style={{
            width: "15%",
            textAlign: "right",
            paddingRight: 8,
            fontFamily: "Helvetica-Bold",
          }}
        >
          {(
            Number.parseFloat(total) +
            (Number.parseFloat(total) * Number.parseFloat(invoice?.tax)) / 100
          ).toFixed(3)}{" "}
          KD
        </Text>
      </View>
    </Fragment>
  );
};

const InvoiceItemsTable = ({ invoice }: any) => (
  <View
    style={{
      flexDirection: "row",
      flexWrap: "wrap",
      borderWidth: 1,
      marginTop: "130px",
      borderColor: "#3778C2",
    }}
  >
    <InvoiceItemsTableHeader />
    <InvoiceTableRow items={invoice?.items} />
    <InvoiceTableFooter invoice={invoice} />
  </View>
);

export default function InvoicePdfDocument({ invoicedata }: any) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <InvoiceNo invoice={invoicedata} />
        <InvoiceTitle title={"Invoice"} />
        <InvoiceTo invoice={invoicedata} />
        <InvoiceItemsTable invoice={invoicedata} />
        <Text
          style={styles.pageNumbers}
          render={({ pageNumber, totalPages }) =>
            `${pageNumber} of ${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>
  );
}
