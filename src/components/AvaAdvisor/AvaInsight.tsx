import React, { useEffect, useState } from 'react';

import { getInsights, type InsightsResult } from '@antv/ava';
import { InsightCard } from '@antv/ava-react';
import { Carousel } from 'antd';

interface AvaInsightProps {
  data: Record<string, any>[];
}

const AvaInsight: React.FC<AvaInsightProps> = ({ data }) => {
  const [result, setResult] = useState<InsightsResult>({
    insights: [],
  });

  useEffect(() => {
    async function getInsight() {
      console.log('data ', data)
      const insightResult = getInsights(data, {
        limit: 10,
        // dimensions: [{ fieldName: 'date' }],
        // measures: [{ fieldName: 'discount_price', method: 'SUM' }],
        visualization: true,
        homogeneous: true,
      });
      console.log('insightResult ', insightResult)
      setResult(insightResult);
    }
    getInsight();
  }, [data]);

  return result.insights?.length > 0 ? (
    <div className="cs-w-full cs-h-full cs-overflow-hidden">
      <Carousel arrows={false}>
        {result.insights &&
          result.insights.map((insight, index) => {
            return <InsightCard visualizationOptions={{ lang: 'zh-CN' }} insightInfo={insight} key={index} />;
          })}
      </Carousel>
    </div>
  ) : (
    <span>未找到可视化结果。</span>
  );
};

export default AvaInsight;
