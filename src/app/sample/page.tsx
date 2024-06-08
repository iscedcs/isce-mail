import PtPromotionMail from "../../../emails/templates/palmtechniq/promotion";
import React from "react";

export default function SamplePage() {
  return (
    <PtPromotionMail
      image="static/dummy-images/image-5.png"
      link="isce.app"
      message="a message that is very long"
      headerText="lol"
    />
  );
}
