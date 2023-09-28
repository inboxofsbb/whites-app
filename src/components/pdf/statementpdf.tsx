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
    paddingBottom: 40,
    lineHeight: 1.5,

    flexDirection: "column",
    fontFamily: "Helvetica",
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
  logo: {
    width: 110,
    height: 27,
    marginLeft: "auto",
    marginRight: "auto",
    position: "absolute",
    left: 0,
  },

  reportTitle: {
    color: "#3778C2",
    fontWeight: "black",
    marginTop: 35,
    fontSize: 22,
    textAlign: "center",
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
  },
});

const StatementTitle = ({ title }: any) => (
  <View>
    <Text style={styles.reportTitle}>{title}</Text>
  </View>
);

const StatementDetails = ({ statements }: any) => (
  <View>
    <Image style={styles.logo} src={"/assets/images/tcomp_logo.png"} />
  </View>
);

const StatementTo = ({ statement }: any) => {
  return (
    <Fragment>
      <View
        style={{
          position: "absolute",
          textAlign: "right",
          alignItems: "flex-end",
          right: 48,
          top: "110px",
          marginTop: 36,
          width: "40%",
        }}
      >
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
            {statement?.fromDate &&
              DateTime.fromISO(statement?.fromDate).toFormat("dd LLL yyyy")}
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
              fontStyle: "bold",
            }}
          >
            {statement?.toDate &&
              DateTime.fromISO(statement?.toDate).toFormat("dd LLL yyyy")}
          </Text>
        </View>
      </View>
      <View
        style={{
          position: "absolute",
          left: 48,
          top: "100px",
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
        <Text>{process.env["NEXT_PUBLIC_SCHOOL_NAME"]}</Text>
        <Text>{process.env["NEXT_PUBLIC_SCHOOL_ADDRESS"]}</Text>
      </View>
    </Fragment>
  );
};

const StatementTableHeader = () => (
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
    }}
  >
    <Text
      style={{
        width: "15%",
        borderRightColor: borderColor,
        borderRightWidth: 1,
      }}
    >
      Date
    </Text>
    <Text
      style={{
        width: "50%",
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
      Credit
    </Text>
    <Text
      style={{
        width: "10%",
        borderRightColor: borderColor,
        borderRightWidth: 1,
      }}
    >
      Debit
    </Text>
    <Text
      style={{
        width: "15%",
      }}
    >
      Balance (KD)
    </Text>
  </View>
);
const StatementTableRow = ({ items }: any) => {
  const rows = items?.map((item: any) => (
    <View
      wrap
      style={{
        flexDirection: "row",
        borderBottomColor: "#3778C2",
        borderBottomWidth: 1,
        alignItems: "center",
        flexWrap: "wrap",
        fontStyle: "bold",
      }}
      key={item?.id}
    >
      <View
        style={{
          width: "15%",
          height: "100%",
          minWidth: "15%",
          textAlign: "right",
          justifyContent:"center",
          alignContent:"center",
          alignItems:"center",
          paddingTop: 5,
          paddingRight: 8,
        }}
      >
        <Text>
          {item?.date
            ? DateTime.fromISO(item?.date).toFormat("dd LLL yyyy")
            : ""}
        </Text>
      </View>

      <Text
        style={{
          width: "50%",

          paddingTop: 5,
          paddingLeft: 8,
        }}
      >
        {item?.id != 0
          ? item.sourceType == "debit"
            ? "Invoice generated, Invoice Id :" +
              item.sourceId +
              ", " +
              item.description
            : "Amount paid, " + item?.description
          : "Opening Balance"}
      </Text>

      <Text
        style={{
          width: "10%",

          paddingTop: 5,
          textAlign: "right",
          paddingRight: 8,
        }}
      >
        {item?.id != 0
          ? item.creditAmt
            ? Number(item.creditAmt)?.toFixed(3)
            : 0
          : ""}
      </Text>
      <Text
        style={{
          width: "10%",

          textAlign: "right",
          paddingTop: 5,
          paddingRight: 8,
        }}
      >
        {item?.id != 0
          ? item.debitAmt
            ? Number(item.debitAmt)?.toFixed(3)
            : 0
          : ""}
      </Text>
      <Text
        style={{
          width: "15%",
          textAlign: "right",
          paddingRight: 8,
          paddingTop: 5,
        }}
      >
        {Number(item.currentBalance)?.toFixed(3)}
      </Text>
    </View>
  ));
  return <Fragment>{rows}</Fragment>;
};

const StatementTable = ({ statement }: any) => (
  <View
    wrap
    style={{
      borderLeftWidth:1,
      borderRightWidth:1,
      marginTop: "130px",
      borderColor: "#3778C2",
    }}
  >
    <StatementTableHeader />
    <StatementTableRow items={statement.data} />
  </View>
);

export default function StatementPdfDocument({ statement }: any) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <StatementDetails statements={statement} />
        <StatementTitle title={"Account Statement"} />
        <StatementTo statement={statement} />
        <StatementTable statement={statement} />
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
